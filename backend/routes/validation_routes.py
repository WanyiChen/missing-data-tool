from fastapi import APIRouter, File, UploadFile, Request, Form
from fastapi.responses import JSONResponse
from sklearn.preprocessing import LabelEncoder
from typing import Dict
import os
import pandas as pd
import numpy as np
import io
import json
from models.feature import FEATURE_CACHE




__all__ = ["latest_uploaded_file", "latest_uploaded_filename", "df"]

router = APIRouter()

@router.get("/")
def read_root():
    return {"message": "Hello World"}

@router.post("/api/validate-upload")
async def validate_upload(request: Request, file: UploadFile = File(...)):
    MAX_SIZE = 100 * 1024 * 1024  # 100 MB
    ACCEPTED_EXTENSIONS = {".csv", ".xls", ".xlsx"}

    # Check extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ACCEPTED_EXTENSIONS:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, your file format is not recognized. The supported file formats are csv, xls, and xlsx."})

    # Read file content
    contents = await file.read()
    
    # Check size
    size = len(contents)
    if size > MAX_SIZE:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, your file is too large. The maximum file size is 100MB."})

    # Use pandas to check for actual data
    try:
        if ext == ".csv":
            # Detect separator for CSV files
            sample = contents[:1024].decode('utf-8', errors='ignore')
            if ';' in sample and sample.count(';') > sample.count(','):
                sep = ';'
            else:
                sep = ','
            df_raw = pd.read_csv(io.BytesIO(contents), header=None, sep=sep, low_memory=False)
        else:
            df_raw = pd.read_excel(io.BytesIO(contents), header=None)
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, we could not read your file. Please ensure it is a valid and uncorrupted file."})

    if df_raw.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Sorry, your file appears to be empty. Please double check."})

    # Detect feature names: all strings in first row
    first_row = df_raw.iloc[0].tolist()
    all_strings = all(isinstance(cell, str) for cell in first_row)
    has_feature_names = all_strings

    # Create dataframe accordingly
    if has_feature_names:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        title_row = df.columns.tolist()
        data_rows = df.head(10).values.tolist()
    else:
        df = df_raw.copy()
        df.columns = [f"Feature {i+1}" for i in range(df.shape[1])]
        title_row = df.columns.tolist()
        data_rows = df.head(10).values.tolist()

    # Save file and dataframe for later use
    request.app.state.latest_uploaded_file = contents
    request.app.state.latest_uploaded_filename = filename
    request.app.state.df = df
    request.app.state.feature_names = has_feature_names

    # Clear all caches for new dataset
    FEATURE_CACHE.clear()


    # Convert numpy values for JSON
    def convert_numpy_values(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        else:
            return obj

    converted_data_rows = []
    for row in data_rows:
        converted_row = [convert_numpy_values(cell) for cell in row]
        converted_data_rows.append(converted_row)

    return {
        "success": True,
        "has_feature_names": has_feature_names,
        "title_row": title_row,
        "data_rows": converted_data_rows
    }

@router.post("/api/update-feature-names")
async def update_feature_names(request: Request, featureNames: str = Form(...)):
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})

    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            if featureNames == "false":
                df = pd.read_csv(io.BytesIO(file))
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_csv(io.BytesIO(file))
        else:
            if featureNames == "false":
                df = pd.read_excel(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})

    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})

    request.app.state.df = df
    request.app.state.feature_names = featureNames == "true"
    
    # Clear cached missing data mechanism since dataframe changed
    from routes.dashboard_routes import clear_missing_mechanism_cache
    clear_missing_mechanism_cache(request)

    # Clear feature cache
    FEATURE_CACHE.clear()

    title_row = df.columns.tolist()
    data_rows = df.head(10).values.tolist()

    def convert_numpy_values(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        else:
            return obj

    converted_data_rows = []
    for row in data_rows:
        converted_row = [convert_numpy_values(cell) for cell in row]
        converted_data_rows.append(converted_row)

    return {
        "success": True,
        "title_row": title_row,
        "data_rows": converted_data_rows
    }

@router.post("/api/submit-feature-names")
async def submit_feature_names(request: Request, featureNames: str = Form(...)):
    """
    Handle submission of question 1: feature names configuration
    """
    if featureNames not in ["true", "false"]:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid featureNames value. Must be 'true' or 'false'."})
    
    # Store the feature names configuration
    request.app.state.feature_names = featureNames == "true"
    
    # Process the data with the feature names configuration
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            if not request.app.state.feature_names:
                df = pd.read_csv(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_csv(io.BytesIO(file))
        else:
            if not request.app.state.feature_names:
                df = pd.read_excel(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    
    if df.empty:
        return JSONResponse(status_code=400, content={"success": False, "message": "Uploaded file is empty."})
    
    # Store the processed dataframe
    request.app.state.df = df
    
    # Clear cached missing data mechanism since dataframe changed
    from routes.dashboard_routes import clear_missing_mechanism_cache
    clear_missing_mechanism_cache(request)

    # Clear feature cache
    FEATURE_CACHE.clear()
    
    return {"success": True, "message": "Feature names configuration saved successfully."}

@router.post("/api/submit-missing-data-options")
async def submit_missing_data_options(request: Request, missingDataOptions: str = Form(...)):
    """
    Handle submission of question 2: missing data options
    """
    try:
        missing_data_options = json.loads(missingDataOptions)
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid missingDataOptions format."})
    
    # Validate required fields
    required_fields = ["blanks", "na", "other", "otherText"]
    for field in required_fields:
        if field not in missing_data_options:
            return JSONResponse(status_code=400, content={"success": False, "message": f"Missing required field: {field}"})
    
    # Store the missing data options
    request.app.state.missing_data_options = missing_data_options
    
    # Get the current dataframe
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete question 1 first."})
    
    # Apply missing data replacements
    df_processed = df.copy()
    
    if missing_data_options["na"]:
        df_processed.replace("N/A", np.nan, inplace=True)
    
    other_text = missing_data_options.get("otherText", "")
    if other_text and missing_data_options["other"]:
        for text in other_text.split(","):
            text = text.strip()
            try:
                # Try to convert to float to detect numeric values (including decimals)
                numeric_value = float(text)
                # Replace both numeric and string representations
                df_processed.replace(numeric_value, np.nan, inplace=True)
                df_processed.replace(text, np.nan, inplace=True)
            except ValueError:
                # If conversion fails, treat as text
                df_processed.replace(text, np.nan, inplace=True)
    
    # Store the processed dataframe
    request.app.state.df = df_processed
    
    # Clear cached missing data mechanism since dataframe changed
    from routes.dashboard_routes import clear_missing_mechanism_cache
    clear_missing_mechanism_cache(request)
    
    return {"success": True, "message": "Missing data options saved successfully."}

@router.post("/api/submit-target-feature")
async def submit_target_feature(request: Request, targetFeature: str = Form(...), targetType: str = Form(...)):
    """
    Handle submission of question 3: target feature configuration
    """
    # Handle skip case (empty target feature)
    if not targetFeature or not targetType:
        # Store empty target feature configuration
        request.app.state.target_feature = ""
        request.app.state.target_type = ""
        
        # Get the current dataframe
        df = getattr(request.app.state, "df", None)
        if df is None:
            return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete previous questions first."})
        
        # Apply label encoding for all categorical columns
        df_encoded = df.copy()
        for col in df_encoded.columns:
            if df_encoded[col].dtype == 'object':
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
        
        # Ensure label encoding doesn't replace NaN values
        for col in df_encoded.columns:
            mask = df[col].isna()
            if mask.any():
                # Convert to nullable integer type if needed
                if df_encoded[col].dtype in ['int64', 'int32']:
                    df_encoded[col] = df_encoded[col].astype('Int64')
                df_encoded.loc[mask, col] = pd.NA
        
        # Store the final processed dataframe
        request.app.state.df = df_encoded
        
        # Clear cached missing data mechanism since dataframe changed
        from routes.dashboard_routes import clear_missing_mechanism_cache
        clear_missing_mechanism_cache(request)
        
        return {"success": True, "message": "Target feature configuration skipped successfully."}
    
    if targetType not in ["numerical", "categorical"]:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid target type. Must be 'numerical' or 'categorical'."})
    
    # Store the target feature configuration
    request.app.state.target_feature = targetFeature
    request.app.state.target_type = targetType
    
    # Get the current dataframe
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete previous questions first."})
    
    # Check if target feature exists in the dataframe
    if targetFeature not in df.columns:
        return JSONResponse(status_code=400, content={"success": False, "message": f"Target feature '{targetFeature}' not found in the dataset."})
    
    # Apply label encoding for categorical columns (excluding target feature if it's categorical)
    df_encoded = df.copy()
    for col in df_encoded.columns:
        if col != targetFeature and df_encoded[col].dtype == 'object':
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
    
    # Ensure label encoding doesn't replace NaN values
    for col in df_encoded.columns:
        mask = df[col].isna()
        if mask.any():
            # Convert to nullable integer type if needed
            if df_encoded[col].dtype in ['int64', 'int32']:
                df_encoded[col] = df_encoded[col].astype('Int64')
            df_encoded.loc[mask, col] = pd.NA
    
    # Store the final processed dataframe
    request.app.state.df = df_encoded
    
    # Clear cached missing data mechanism since dataframe changed
    from routes.dashboard_routes import clear_missing_mechanism_cache
    clear_missing_mechanism_cache(request)
    
    return {"success": True, "message": "Target feature configuration saved successfully."}

    # # Initialize feature cache after data is loaded
    # from .features_routes import initialize_feature_cache
    # initialize_feature_cache(df_encoded)

    # return None


# DONE:  Check for N/A validation

@router.get("/api/detect-missing-data-options")
async def detect_missing_data_options(request: Request):
    """
    Analyze the uploaded dataset and suggest which missing data options ("blanks", "na") should be pre-selected.
    """
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet."})

    # Detect blanks (empty strings, whitespace, or NaN)
    blanks_detected = False
    na_detected = False

    # Variations of N/A to check
    na_variations = {"n/a", "na", "nan", "null", "none"}

    for col in df.columns:
        # Check for blanks (empty string or whitespace)
        if df[col].apply(lambda x: isinstance(x, str) and (x.strip() == "" or x.isspace())).any():
            blanks_detected = True
        # Check for NaN (already handled by pandas)
        if df[col].isnull().any():
            blanks_detected = True
        # Check for N/A variations
        if df[col].apply(lambda x: isinstance(x, str) and x.strip().lower() in {v.lower() for v in na_variations}).any():
            na_detected = True

    return {
        "success": True,
        "suggestions": {
            "blanks": blanks_detected,
            "na": na_detected
        }
    }


@router.post("/api/dataset-preview-live")
async def dataset_preview_live(
    request: Request,
    missingDataOptions: str = Form(...),
    featureNames: str = Form(...)
):
    """
    Return a preview of the dataset with live missing data options applied.
    Also allows updating feature names if featureNames is provided.
    """
    try:
        missing_data_options = json.loads(missingDataOptions)
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid missingDataOptions format."})

    # Get uploaded dataframe
    # Process the data with the feature names configuration
    file = getattr(request.app.state, "latest_uploaded_file", None)
    filename = getattr(request.app.state, "latest_uploaded_filename", None)
    
    if file is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded yet."})
    
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".csv":
            # Detect separator for CSV files
            sample = file[:1024].decode('utf-8', errors='ignore')
            if ';' in sample and sample.count(';') > sample.count(','):
                sep = ';'
            else:
                sep = ','
            if featureNames == "false":
                df = pd.read_csv(io.BytesIO(file), header=None, sep=sep, low_memory=False)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_csv(io.BytesIO(file), sep=sep, low_memory=False)
        else:
            if featureNames == "false":
                df = pd.read_excel(io.BytesIO(file), header=None)
                df.columns = [f"Feature {i+1}" for i in range(len(df.columns))]
            else:
                df = pd.read_excel(io.BytesIO(file))
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Could not read uploaded file."})
    
    # Apply missing data options
    df_preview = df.copy()
    if missing_data_options.get("na", False):
        df_preview.replace("N/A", np.nan, inplace=True)

    other_text = missing_data_options.get("otherText", "")
    if other_text and missing_data_options.get("other", False):
        for text in other_text.split(","):
            text = text.strip()
            try:
                # Try to convert to float to detect numeric values (including decimals)
                numeric_value = float(text)
                # Replace both numeric and string representations
                df_preview.replace(numeric_value, np.nan, inplace=True)
                df_preview.replace(text, np.nan, inplace=True)
            except ValueError:
                # If conversion fails, treat as text
                df_preview.replace(text, np.nan, inplace=True)

    title_row = df_preview.columns.tolist()
    data_rows = df_preview.head(10).values.tolist()

    def convert_numpy_values(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        else:
            return obj

    converted_data_rows = []
    for row in data_rows:
        converted_row = [convert_numpy_values(cell) for cell in row]
        converted_data_rows.append(converted_row)

    return {
        "success": True,
        "title_row": title_row,
        "data_rows": converted_data_rows
    }

@router.get("/api/target-feature-status")
def get_target_feature_status(request: Request):
    """
    Check if a target feature has been configured.
    """
    target_feature = getattr(request.app.state, "target_feature", None)
    target_type = getattr(request.app.state, "target_type", None)
    
    has_target = bool(target_feature and target_feature.strip())
    
    return {
        "success": True,
        "has_target_feature": has_target,
        "target_feature": target_feature if has_target else None,
        "target_type": target_type if has_target else None
    }

@router.get("/api/missing-data-analysis")
def missing_data_analysis(request: Request):
    df = getattr(request.app.state, "df", None)
    if df is None:
        return JSONResponse(status_code=400, content={"success": False, "message": "No data processed yet. Please complete question 1 first."})
    
    # Analyze missing data patterns
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = df.isnull().sum().sum()
    
    # Count different types of missing values
    empty_strings = 0
    whitespace_only = 0
    null_values = missing_cells  # pandas null values
    
    # Check for empty strings and whitespace-only strings
    for col in df.columns:
        if df[col].dtype == 'object':  # string columns
            empty_strings += (df[col] == '').sum()
            whitespace_only += df[col].astype(str).str.strip().eq('').sum()
    
    # Calculate percentages
    missing_percentage = (missing_cells / total_cells * 100) if total_cells > 0 else 0
    empty_string_percentage = (empty_strings / total_cells * 100) if total_cells > 0 else 0
    whitespace_percentage = (whitespace_only / total_cells * 100) if total_cells > 0 else 0
    
    # Find columns with most missing data
    missing_by_column = df.isnull().sum().to_dict()
    columns_with_missing = {col: count for col, count in missing_by_column.items() if count > 0}
    
    # Sort columns by missing count
    sorted_columns = sorted(columns_with_missing.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "success": True,
        "total_cells": int(total_cells),
        "missing_cells": int(missing_cells),
        "missing_percentage": round(missing_percentage, 2),
        "missing_patterns": {
            "null_values": int(null_values),
            "empty_strings": int(empty_strings),
            "whitespace_only": int(whitespace_only)
        },
        "pattern_percentages": {
            "null_percentage": round((null_values / total_cells * 100) if total_cells > 0 else 0, 2),
            "empty_string_percentage": round(empty_string_percentage, 2),
            "whitespace_percentage": round(whitespace_percentage, 2)
        },
        "columns_with_missing": dict(sorted_columns[:10]),  # Top 10 columns with missing data
        "total_columns_with_missing": len(columns_with_missing)
    }