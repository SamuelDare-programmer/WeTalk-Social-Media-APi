# from fastapi import FastAPI
# from app.core.auth.routes import router as auth_router
# from app.posts.routes import router as posts_router
# from contextlib import asynccontextmanager
# from app.core.db.database import db_client
# from app.posts.models import Post, Media
# from app.core.auth.models import User
# from beanie import init_beanie

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # on startup
#     await init_app()
#     yield
#     # on shutdown
#     db_client.close()

# async def init_app():
#     await init_beanie(
#         database=db_client.wetalk,
#         document_models=[
#             User,
#             Post,
#             Media,
#         ],
#     )

# app = FastAPI(lifespan=lifespan)

# app.include_router(auth_router, prefix="/api/v1")
# app.include_router(posts_router, prefix="/api/v1")