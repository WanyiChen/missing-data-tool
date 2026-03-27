from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import io
import json

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://*.vercel.app",   # All Vercel deployments
        "https://missing-data-tool.vercel.app",  # Your specific domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Missing Data Tool Backend is running"}

# Import routers from new modules
from routes.validation_routes import router as validation_router
from routes.dashboard_routes import router as dashboard_router
from routes.features_routes import router as features_router
from routes.delete_missing_routes import router as delete_missing_router

app.include_router(validation_router)
app.include_router(dashboard_router)
app.include_router(features_router)
app.include_router(delete_missing_router)