from fastapi import APIRouter, HTTPException
from supabase import create_client
from app.config import SUPABASE_URL, SUPABASE_KEY
from app.services.youtube_download import download_audio
from app.services.audio_processing import (
    get_audio_embedding,
    get_bpm_and_key,
    pad_embedding_to_1536
)
from app.services.similarity import find_most_similar_song
from pydantic import BaseModel
import os
import shutil
import json

router = APIRouter()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------- REQUEST MODEL ----------
class CompareRequest(BaseModel):
    user_uid: str
    youtube_url: str


# ---------- ROUTE ----------
@router.post("/compare")
async def compare_song(request: CompareRequest):
    user_uid = request.user_uid
    youtube_url = request.youtube_url

    if not user_uid or not youtube_url:
        raise HTTPException(
            status_code=400,
            detail="user_uid and youtube_url are required"
        )

    wav_path = None

    try:
        # 1. Download audio
        wav_path, from_title, video_id = download_audio(youtube_url)

        # 2. Extract BPM, key, embedding
        bpm, music_key = get_bpm_and_key(wav_path)
        emb_512 = [float(x) for x in get_audio_embedding(wav_path)]

        if len(emb_512) != 512:
            raise HTTPException(
                status_code=500,
                detail=f"Embedding dimension mismatch: {len(emb_512)}"
            )

        # 3. Fetch songs from DB
        db_songs = supabase.table("songs").select("*").execute().data
        if not db_songs:
            raise HTTPException(status_code=404, detail="No songs found")

        # 4. Find best match
        best_song, similarity = find_most_similar_song(emb_512, db_songs)
        if not best_song:
            raise HTTPException(status_code=404, detail="No match found")

        matched_song_id = best_song.get("id")
        matched_title = best_song.get("title", "")
        matched_url = best_song.get("url", "")

        if matched_song_id is None:
            raise HTTPException(
                status_code=500,
                detail="Matched song missing ID"
            )

        matched_song_id = int(matched_song_id)

        # 5. Pad embedding for DB
        emb_1536 = pad_embedding_to_1536(emb_512)

        if not isinstance(emb_1536, list) or not all(
            isinstance(x, (int, float)) for x in emb_1536
        ):
            raise HTTPException(
                status_code=500,
                detail="Invalid embedding format"
            )

        # 6. Prepare DB record
        comparison_data = {
            "user_uid": str(user_uid),
            "uploaded_url": youtube_url,
            "uploaded_bpm": int(bpm),
            "uploaded_key": music_key,
            "uploaded_embedding": emb_1536,
            "matched_song_id": matched_song_id,
            "matched_url": matched_url,
            "matched_title": matched_title,
            "from_title": from_title,
            "similarity": float(similarity),
        }

        # 7. Insert into DB (with fallback)
        try:
            result = supabase.table("comparisons").insert(comparison_data).execute()
        except Exception:
            # fallback: serialize embedding as JSON
            comparison_data["uploaded_embedding"] = json.dumps(emb_1536)
            result = supabase.table("comparisons").insert(comparison_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to save comparison"
            )

        # 8. Response
        inserted = result.data[0]

        return {
            "comparison_id": inserted["id"],
            "from_title": from_title,
            "matched_title": matched_title,
            "matched_url": matched_url,
            "similarity": float(similarity),
            "uploaded_bpm": bpm,
            "uploaded_key": music_key,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing song: {str(e)}"
        )

    finally:
        # 9. Cleanup
        if wav_path and os.path.exists(wav_path):
            try:
                shutil.rmtree(os.path.dirname(wav_path), ignore_errors=True)
            except Exception as e:
                print(f"Cleanup warning: {e}")
