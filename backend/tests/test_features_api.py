"""
Unit tests for FastAPI endpoints that use the calculate_informative_missingness function.
Tests the API integration of the selective MIM algorithm.
"""

import pytest
from fastapi.testclient import TestClient
import pandas as pd
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from models.feature import FEATURE_CACHE

client = TestClient(app)


@pytest.fixture
def sample_dataframe():
    np.random.seed(42)
    
    df = pd.DataFrame({
        'feature_with_informative_missing': np.random.randn(100),
        'feature_with_random_missing': np.random.randn(100),
        'categorical_feature': np.random.choice(['A', 'B', 'C'], 100),
        'complete_feature': np.arange(100),
        'target_categorical': np.random.choice([0, 1], 100),
        'target_numerical': np.random.randn(100) * 10 + 50
    })
    
    # Create informative missingness - more missing when target=1
    for i in range(len(df)):
        if df.loc[i, 'target_categorical'] == 1:
            if np.random.rand() < 0.7:
                df.loc[i, 'feature_with_informative_missing'] = np.nan
        else:
            if np.random.rand() < 0.1:
                df.loc[i, 'feature_with_informative_missing'] = np.nan
    
    # Random missingness pattern
    mask = np.random.rand(100) < 0.2
    df.loc[mask, 'feature_with_random_missing'] = np.nan
    
    return df


@pytest.fixture
def setup_app_state(sample_dataframe):
    # Setup app state with test data
    app.state.df = sample_dataframe
    app.state.target_feature = 'target_categorical'
    app.state.target_type = 'categorical'
    
    yield
    
    # Cleanup after test
    FEATURE_CACHE.clear()
    if hasattr(app.state, 'df'):
        delattr(app.state, 'df')
    if hasattr(app.state, 'target_feature'):
        delattr(app.state, 'target_feature')
    if hasattr(app.state, 'target_type'):
        delattr(app.state, 'target_type')


# Test that API correctly detects informative missingness with categorical target
def test_feature_details_with_informative_missingness(setup_app_state):
    response = client.get("/api/feature-details/feature_with_informative_missing")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] == True
    assert data["feature_name"] == "feature_with_informative_missing"
    
    assert "informative_missingness" in data
    assert isinstance(data["informative_missingness"], dict)
    assert "is_informative" in data["informative_missingness"]
    assert "p_value" in data["informative_missingness"]
    assert isinstance(data["informative_missingness"]["is_informative"], bool)
    assert isinstance(data["informative_missingness"]["p_value"], float)


# Test that API correctly identifies non-informative (random) missingness
def test_feature_details_with_random_missingness(setup_app_state):
    response = client.get("/api/feature-details/feature_with_random_missing")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "informative_missingness" in data
    
    p_value = data["informative_missingness"]["p_value"]
    is_informative = data["informative_missingness"]["is_informative"]
    assert p_value > 0.05 or is_informative == False


# Test that features with no missing data return default values
def test_feature_details_with_no_missing_data(setup_app_state):
    response = client.get("/api/feature-details/complete_feature")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["informative_missingness"]["is_informative"] == False
    assert data["informative_missingness"]["p_value"] == 1.0


# Test that API handles missing target configuration gracefully
def test_feature_details_without_target(sample_dataframe):
    app.state.df = sample_dataframe
    
    try:
        response = client.get("/api/feature-details/feature_with_informative_missing")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["informative_missingness"]["is_informative"] == False
        assert data["informative_missingness"]["p_value"] == 1.0
        
    finally:
        FEATURE_CACHE.clear()
        if hasattr(app.state, 'df'):
            delattr(app.state, 'df')


# Test informative missingness calculation with numerical target (uses t-test)
def test_feature_details_with_numerical_target(sample_dataframe):
    app.state.df = sample_dataframe
    app.state.target_feature = 'target_numerical'
    app.state.target_type = 'numerical'
    
    try:
        response = client.get("/api/feature-details/feature_with_informative_missing")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "informative_missingness" in data
        assert isinstance(data["informative_missingness"]["is_informative"], bool)
        assert isinstance(data["informative_missingness"]["p_value"], float)
        assert 0 <= data["informative_missingness"]["p_value"] <= 1
        
    finally:
        FEATURE_CACHE.clear()
        if hasattr(app.state, 'df'):
            delattr(app.state, 'df')
        if hasattr(app.state, 'target_feature'):
            delattr(app.state, 'target_feature')
        if hasattr(app.state, 'target_type'):
            delattr(app.state, 'target_type')


# Test that requesting a non-existent feature returns 404 error
def test_feature_details_nonexistent_feature(setup_app_state):
    response = client.get("/api/feature-details/this_feature_does_not_exist")
    
    assert response.status_code == 404
    data = response.json()
    assert data["success"] == False
    assert "not found" in data["message"].lower()


# Test that missing features table endpoint returns only features with missing data
def test_get_missing_features_table(setup_app_state):
    response = client.get("/api/missing-features-table?page=0&limit=10")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] == True
    assert "features" in data
    assert "pagination" in data
    assert len(data["features"]) > 0
    
    for feature in data["features"]:
        assert feature["number_missing"] > 0


# Test that complete features table endpoint returns only features without missing data
def test_get_complete_features_table(setup_app_state):
    response = client.get("/api/complete-features-table?page=0&limit=10")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] == True
    assert "features" in data
    
    for feature in data["features"]:
        assert feature["number_missing"] == 0


# Test that endpoints return proper errors when no data is uploaded
def test_endpoints_with_no_data():
    FEATURE_CACHE.clear()
    
    response = client.get("/api/missing-features-table")
    
    assert response.status_code == 400
    data = response.json()
    assert data["success"] == False
    assert "no data available" in data["message"].lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])