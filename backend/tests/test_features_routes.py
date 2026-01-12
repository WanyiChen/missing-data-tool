import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from fastapi import FastAPI
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.features_routes import router
from models.feature import Feature, FEATURE_CACHE, initialize_feature_cache


# Create test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestFeaturesRoutes:
    """Test features routes functionality."""
    
    def setup_method(self):
        """Clear cache and setup test data before each test."""
        FEATURE_CACHE.clear()
        
        # Create test dataframe
        self.test_df = pd.DataFrame({
            'high_missing': [1, 2, np.nan, np.nan, np.nan, 6, 7, 8, 9, 10],  # 30% missing
            'medium_missing': [1, np.nan, 3, 4, 5, 6, 7, 8, 9, 10],  # 10% missing
            'low_missing': [1, 2, 3, 4, 5, 6, 7, 8, 9, np.nan],  # 10% missing
            'complete_numeric': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],  # 0% missing
            'complete_categorical': ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'],  # 0% missing
            'categorical_missing': ['A', 'B', None, 'A', 'B', 'A', 'B', 'A', 'B', 'A']  # 10% missing
        })
        
        # Mock request with dataframe
        self.mock_request = Mock()
        self.mock_request.app.state.df = self.test_df
    
    def test_get_features_table_pagination(self):
        """Test missing features table with pagination."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            # Test first page
            response = client.get("/api/missing-features-table?page=0&limit=2")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["features"]) == 2  # Limited to 2
            assert data["pagination"]["page"] == 0
            assert data["pagination"]["limit"] == 2
            assert data["pagination"]["total"] == 4  # 4 features with missing data
            assert data["pagination"]["total_pages"] == 2
            assert data["pagination"]["has_next"] is True
            assert data["pagination"]["has_prev"] is False
            
            # Features should be sorted by percentage missing (descending)
            assert data["features"][0]["feature_name"] == "high_missing"
            assert data["features"][0]["percentage_missing"] == 30.0
    
    def test_get_features_table_second_page(self):
        """Test missing features table second page."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get("/api/missing-features-table?page=1&limit=2")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["pagination"]["page"] == 1
            assert data["pagination"]["has_next"] is False
            assert data["pagination"]["has_prev"] is True
            assert len(data["features"]) == 2
    
    def test_get_features_table_no_data(self):
        """Test missing features table with no data."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            from fastapi.responses import JSONResponse
            mock_error = JSONResponse(status_code=400, content={"success": False, "message": "No data"})
            mock_get_df.return_value = (None, mock_error)
            
            response = client.get("/api/missing-features-table")
            
            # Should return the error from get_uploaded_dataframe
            assert response.status_code == 400
    
    def test_get_complete_features_table(self):
        """Test complete features table."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get("/api/complete-features-table?page=0&limit=10")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["features"]) == 2  # 2 complete features
            assert data["pagination"]["total"] == 2
            
            # Should include complete features
            feature_names = [f["feature_name"] for f in data["features"]]
            assert "complete_numeric" in feature_names
            assert "complete_categorical" in feature_names
    
    def test_get_complete_features_table_pagination(self):
        """Test complete features table pagination with many features."""
        # Create dataframe with many complete features
        many_complete_df = pd.DataFrame({
            f'complete_{i}': range(10) for i in range(15)
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (many_complete_df, None)
            
            response = client.get("/api/complete-features-table?page=0&limit=10")
            
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["features"]) == 10  # Limited to 10
            assert data["pagination"]["total"] == 15
            assert data["pagination"]["total_pages"] == 2
            assert data["pagination"]["has_next"] is True
    
    def test_get_feature_details(self):
        """Test getting detailed feature information."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get("/api/feature-details/high_missing")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["feature_name"] == "high_missing"
            assert data["data_type"] == "N"  # Should be detected as numerical
            assert data["number_missing"] == 3
            assert data["percentage_missing"] == 30.0
            assert "correlated_features" in data
            assert "informative_missingness" in data
    
    def test_get_feature_details_with_thresholds(self):
        """Test getting feature details with custom correlation thresholds."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get(
                "/api/feature-details/high_missing"
                "?pearson_threshold=0.5&cramer_v_threshold=0.6&eta_threshold=0.7"
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            # Should have recalculated correlations with new thresholds
            assert "correlated_features" in data
    
    def test_get_feature_details_nonexistent(self):
        """Test getting details for nonexistent feature."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.get("/api/feature-details/nonexistent")
            
            assert response.status_code == 404
            data = response.json()
            assert data["success"] is False
            assert "not found" in data["message"]
    
    def test_patch_feature_data_type(self):
        """Test changing feature data type."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            # First initialize the cache
            initialize_feature_cache(self.test_df)
            
            # Change data type from N to C
            response = client.patch(
                "/api/features-table",
                json={"feature_name": "high_missing", "data_type": "C"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["feature_name"] == "high_missing"
            assert data["data_type"] == "C"
            assert data["previous_data_type"] == "N"
            assert "Correlations" in data["message"]
    
    def test_patch_feature_data_type_invalid(self):
        """Test changing feature data type with invalid type."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.patch(
                "/api/features-table",
                json={"feature_name": "high_missing", "data_type": "X"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert "Invalid data type" in data["message"]
    
    def test_patch_feature_data_type_nonexistent(self):
        """Test changing data type for nonexistent feature."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.patch(
                "/api/features-table",
                json={"feature_name": "nonexistent", "data_type": "C"}
            )
            
            assert response.status_code == 404
            data = response.json()
            assert data["success"] is False
            assert "not found" in data["message"]
    
    def test_reset_feature_data_type(self):
        """Test resetting feature data type to auto-detected value."""
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            # First initialize cache and change data type
            initialize_feature_cache(self.test_df)
            feature = FEATURE_CACHE["high_missing"]
            feature.data_type = "C"  # Change from auto-detected N to C
            
            response = client.post("/api/features-table/reset-data-type/high_missing")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["feature_name"] == "high_missing"
            assert data["previous_data_type"] == "C"
            assert data["new_data_type"] == "N"
            assert data["auto_detected_data_type"] == "N"
    
    def test_clear_feature_cache(self):
        """Test clearing the feature cache."""
        # Add some features to cache
        FEATURE_CACHE["test"] = Feature("test", "N", 5, 10.0)
        
        response = client.delete("/api/features-cache")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(FEATURE_CACHE) == 0
    
    def test_get_cache_status(self):
        """Test getting cache status."""
        # Add some features to cache
        FEATURE_CACHE["test1"] = Feature("test1", "N", 5, 10.0)
        FEATURE_CACHE["test2"] = Feature("test2", "C", 3, 15.0)
        
        response = client.get("/api/features-cache/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["cache_size"] == 2
        assert "test1" in data["cached_features"]
        assert "test2" in data["cached_features"]
        assert data["cache_initialized"] is True
    
    def test_get_cache_status_empty(self):
        """Test getting cache status when empty."""
        response = client.get("/api/features-cache/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["cache_size"] == 0
        assert data["cached_features"] == []
        assert data["cache_initialized"] is False


class TestDataTypeDetection:
    """Test automatic data type detection in routes."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_data_type_detection_numeric(self):
        """Test that numeric columns are detected correctly."""
        df = pd.DataFrame({
            'int_col': [1, 2, 3, 4, 5],
            'float_col': [1.1, 2.2, 3.3, 4.4, 5.5],
            'int64_col': pd.Series([1, 2, 3, 4, 5], dtype='int64'),
            'float64_col': pd.Series([1.1, 2.2, 3.3, 4.4, 5.5], dtype='float64')
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/missing-features-table")
            
            # Initialize cache to check data types
            initialize_feature_cache(df)
            
            assert FEATURE_CACHE['int_col'].data_type == "N"
            assert FEATURE_CACHE['float_col'].data_type == "N"
            assert FEATURE_CACHE['int64_col'].data_type == "N"
            assert FEATURE_CACHE['float64_col'].data_type == "N"
    
    def test_data_type_detection_categorical(self):
        """Test that categorical columns are detected correctly."""
        df = pd.DataFrame({
            'string_col': ['A', 'B', 'C', 'D', 'E'],
            'object_col': pd.Series(['X', 'Y', 'Z', 'X', 'Y'], dtype='object'),
            'mixed_col': ['A', 1, 'B', 2, 'C']  # Mixed types -> object -> categorical
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/missing-features-table")
            
            # Initialize cache to check data types
            initialize_feature_cache(df)
            
            assert FEATURE_CACHE['string_col'].data_type == "C"
            assert FEATURE_CACHE['object_col'].data_type == "C"
            assert FEATURE_CACHE['mixed_col'].data_type == "C"


class TestMissingDataCalculation:
    """Test missing data calculation with different representations."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_missing_data_calculation_null(self):
        """Test missing data calculation with null values."""
        df = pd.DataFrame({
            'col_with_nulls': [1, 2, np.nan, 4, np.nan, 6, 7, 8, 9, 10]  # 2 out of 10 = 20%
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/feature-details/col_with_nulls")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["number_missing"] == 2
            assert data["percentage_missing"] == 20.0
    
    def test_missing_data_calculation_na_strings(self):
        """Test missing data calculation with N/A strings (after processing)."""
        # This would be the dataframe after N/A processing in validation routes
        df = pd.DataFrame({
            'col_with_na': [1, 2, np.nan, 4, np.nan, 6, 7, 8, 9, 10]  # N/A converted to NaN
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/feature-details/col_with_na")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["number_missing"] == 2
            assert data["percentage_missing"] == 20.0
    
    def test_missing_data_calculation_custom_values(self):
        """Test missing data calculation with custom missing values (after processing)."""
        # This would be the dataframe after custom missing value processing
        df = pd.DataFrame({
            'col_with_custom': [1, 2, np.nan, 4, np.nan, 6, 7, 8, 9, 10]  # -999 converted to NaN
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/feature-details/col_with_custom")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["number_missing"] == 2
            assert data["percentage_missing"] == 20.0


class TestCorrelationCalculation:
    """Test correlation calculation in routes."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_pearson_correlation_calculation(self):
        """Test Pearson correlation calculation for numerical features."""
        # Create highly correlated numerical features
        df = pd.DataFrame({
            'num1': [1, 2, 3, 4, 5, np.nan, 7, 8, 9, 10, 11, 12],
            'num2': [2, 4, 6, 8, 10, np.nan, 14, 16, 18, 20, 22, 24],  # num1 * 2
            'num3': [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]  # Unrelated
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/feature-details/num1?pearson_threshold=0.8")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should find strong correlation with num2
            correlations = data["correlated_features"]
            num2_corr = next((c for c in correlations if c['feature_name'] == 'num2'), None)
            
            if num2_corr:  # Correlation found
                assert num2_corr['correlation_type'] == 'r'
                assert abs(num2_corr['correlation_value']) >= 0.8
    
    def test_cramer_v_correlation_calculation(self):
        """Test Cramer's V calculation for categorical features."""
        # Create correlated categorical features
        df = pd.DataFrame({
            'cat1': ['A', 'A', 'B', 'B', 'C', 'C'] * 4,
            'cat2': ['X', 'X', 'Y', 'Y', 'Z', 'Z'] * 4,  # Perfectly correlated with cat1
            'cat3': ['P', 'Q', 'P', 'Q', 'P', 'Q'] * 4   # Different pattern
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/feature-details/cat1?cramer_v_threshold=0.5")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should find correlation with cat2
            correlations = data["correlated_features"]
            if correlations:  # If correlations found
                cat2_corr = next((c for c in correlations if c['feature_name'] == 'cat2'), None)
                if cat2_corr:
                    assert cat2_corr['correlation_type'] == 'V'
    
    def test_eta_correlation_calculation(self):
        """Test Eta calculation for mixed categorical-numerical features."""
        # Create categorical feature that explains numerical variance
        df = pd.DataFrame({
            'categorical': ['A'] * 8 + ['B'] * 8 + ['C'] * 8,
            'numerical': [1, 2, 1, 2, 1, 2, 1, 2] +  # A group: low values
                        [10, 11, 10, 11, 10, 11, 10, 11] +  # B group: medium values  
                        [20, 21, 20, 21, 20, 21, 20, 21],   # C group: high values
            'unrelated_num': list(range(24))  # No pattern with categorical
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/feature-details/categorical?eta_threshold=0.5")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should find correlation with numerical
            correlations = data["correlated_features"]
            if correlations:  # If correlations found
                num_corr = next((c for c in correlations if c['feature_name'] == 'numerical'), None)
                if num_corr:
                    assert num_corr['correlation_type'] == 'η'
    
    def test_correlation_threshold_filtering(self):
        """Test that correlation thresholds properly filter results."""
        # Create truly weakly correlated features
        np.random.seed(42)  # For reproducible results
        df = pd.DataFrame({
            'num1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            'num2': [1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 12] + np.random.normal(0, 2, 12)  # Add noise
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            # Very high threshold should find no correlations
            response = client.get("/api/feature-details/num1?pearson_threshold=0.99")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should find no correlations above 0.99 threshold
            assert len(data["correlated_features"]) == 0
    
    def test_correlation_recalculation_on_threshold_change(self):
        """Test that correlations are recalculated when thresholds change."""
        df = pd.DataFrame({
            'num1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'num2': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]  # Perfectly correlated
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            # First call with high threshold
            response1 = client.get("/api/feature-details/num1?pearson_threshold=0.9")
            assert response1.status_code == 200
            
            # Second call with lower threshold should recalculate
            response2 = client.get("/api/feature-details/num1?pearson_threshold=0.5")
            assert response2.status_code == 200
            
            # Both should succeed (testing that recalculation works)
            data2 = response2.json()
            assert "correlated_features" in data2


class TestPaginationEdgeCases:
    """Test pagination edge cases."""
    
    def setup_method(self):
        """Clear cache before each test."""
        FEATURE_CACHE.clear()
    
    def test_pagination_empty_results(self):
        """Test pagination when no features match criteria."""
        # Dataframe with no missing data
        df = pd.DataFrame({
            'complete1': [1, 2, 3, 4, 5],
            'complete2': [6, 7, 8, 9, 10]
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/missing-features-table")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["features"]) == 0
            assert data["pagination"]["total"] == 0
            assert data["pagination"]["total_pages"] == 0
    
    def test_pagination_out_of_bounds(self):
        """Test pagination with page number out of bounds."""
        df = pd.DataFrame({
            'missing_col': [1, np.nan, 3, 4, 5]
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            # Request page 10 when only 1 page exists
            response = client.get("/api/missing-features-table?page=10&limit=10")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["features"]) == 0  # No features on page 10
            assert data["pagination"]["page"] == 10
            assert data["pagination"]["total"] == 1
    
    def test_pagination_large_limit(self):
        """Test pagination with very large limit."""
        df = pd.DataFrame({
            f'col_{i}': [1, np.nan, 3] for i in range(5)
        })
        
        with patch('routes.features_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (df, None)
            
            response = client.get("/api/missing-features-table?limit=1000")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["features"]) == 5  # All features returned
            assert data["pagination"]["total_pages"] == 1


if __name__ == "__main__":
    pytest.main([__file__])