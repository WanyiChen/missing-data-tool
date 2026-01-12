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

from routes.delete_missing_routes import router
from models.feature import Feature, FEATURE_CACHE

# Create test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestDeleteMissingRoutes:
    """Test delete missing data routes functionality."""
    
    def setup_method(self):
        """Clear cache and setup test data before each test."""
        FEATURE_CACHE.clear()
        
        # Create test dataframe with different patterns
        self.test_df = pd.DataFrame({
            'numeric_affected': [1, 2, np.nan, 4, 5, 6, 7, 8, 9, 10],  
            'numeric_stable': [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],  
            'categorical_affected': ['A', 'B', None, 'A', 'B', 'A', 'B', 'A', 'B', 'A'],  
            'categorical_stable': ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],  
            'complete_feature': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # No missing data
        })
        
        # Initialize feature cache with proper data types
        FEATURE_CACHE['numeric_affected'] = Feature('numeric_affected', 'N', 1, 10.0)
        FEATURE_CACHE['numeric_stable'] = Feature('numeric_stable', 'N', 0, 0.0)
        FEATURE_CACHE['categorical_affected'] = Feature('categorical_affected', 'C', 1, 10.0)
        FEATURE_CACHE['categorical_stable'] = Feature('categorical_stable', 'C', 0, 0.0)
        FEATURE_CACHE['complete_feature'] = Feature('complete_feature', 'N', 0, 0.0)
    
    def test_delete_missing_analysis_success(self):
        """Test successful missing data deletion analysis."""
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["rows_deleted"] == 1 
            assert data["rows_remaining"] == 9
            assert data["total_original_rows"] == 10
            assert isinstance(data["affected_features"], list)
    
    def test_delete_missing_analysis_no_missing_data(self):
        """Test analysis with no missing data."""
        complete_df = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': ['A', 'B', 'C', 'D', 'E']
        })
        
        FEATURE_CACHE.clear()
        FEATURE_CACHE['col1'] = Feature('col1', 'N', 0, 0.0)
        FEATURE_CACHE['col2'] = Feature('col2', 'C', 0, 0.0)
        
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (complete_df, None)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert data["rows_deleted"] == 0
            assert data["rows_remaining"] == 5
            assert len(data["affected_features"]) == 0
    
    def test_delete_missing_analysis_all_rows_deleted(self):
        """Test analysis where all rows contain missing data."""
        all_missing_df = pd.DataFrame({
            'col1': [np.nan, np.nan, np.nan],
            'col2': [np.nan, np.nan, np.nan]
        })
        
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (all_missing_df, None)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 500
            data = response.json()
            
            assert data["success"] is False
            assert "All rows contain missing data" in data["message"]
    
    def test_delete_missing_analysis_no_data(self):
        """Test analysis with no data available."""
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            from fastapi.responses import JSONResponse
            mock_error = JSONResponse(status_code=400, content={"success": False, "message": "No data"})
            mock_get_df.return_value = (None, mock_error)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 400
    
    def test_delete_missing_analysis_empty_dataframe(self):
        """Test analysis with empty dataframe."""
        empty_df = pd.DataFrame()
        
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (empty_df, None)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 400
            data = response.json()
            
            assert data["success"] is False
            assert "no columns" in data["message"]
    
    def test_delete_missing_analysis_memory_error(self):
        """Test analysis with memory error."""
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (self.test_df, None)
            
            with patch('routes.delete_missing_routes.analyze_missing_data_impact') as mock_analyze:
                mock_analyze.side_effect = MemoryError("Out of memory")
                
                response = client.post("/api/delete-missing-data-analysis")
                
                assert response.status_code == 413
                data = response.json()
                
                assert data["success"] is False
                assert "too large" in data["message"]


class TestStatisticalTests:
    """Test statistical test functions."""
    
    def test_ks_test_significant_difference(self):
        """Test KS test with significant difference."""
        from routes.delete_missing_routes import perform_ks_test
        
        # Create series with different distributions
        before = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        after = pd.Series([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])  # Different distribution
        
        p_value = perform_ks_test(before, after)
        
        assert p_value < 0.05  # Should be significant
    
    def test_ks_test_no_difference(self):
        """Test KS test with no difference."""
        from routes.delete_missing_routes import perform_ks_test
        
        # Create identical series
        before = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        after = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        
        p_value = perform_ks_test(before, after)
        
        assert p_value > 0.05  # Should not be significant
    
    def test_ks_test_insufficient_data(self):
        """Test KS test with insufficient data."""
        from routes.delete_missing_routes import perform_ks_test
        
        # Create series with too few data points
        before = pd.Series([1, 2, 3])
        after = pd.Series([4, 5, 6])
        
        p_value = perform_ks_test(before, after)
        
        assert p_value == 1.0  # Should return non-significant
    
    def test_ks_test_empty_data(self):
        """Test KS test with empty data."""
        from routes.delete_missing_routes import perform_ks_test
        
        before = pd.Series([])
        after = pd.Series([1, 2, 3])
        
        p_value = perform_ks_test(before, after)
        
        assert p_value == 1.0  # Should return non-significant
    
    def test_ks_test_constant_values(self):
        """Test KS test with constant values."""
        from routes.delete_missing_routes import perform_ks_test
        
        before = pd.Series([5, 5, 5, 5, 5, 5, 5, 5, 5, 5])
        after = pd.Series([5, 5, 5, 5, 5, 5, 5, 5])  # Same constant value
        
        p_value = perform_ks_test(before, after)
        
        assert p_value == 1.0  # Should return non-significant
    
    def test_chi_square_test_significant_difference(self):
        """Test Chi-square test with significant difference."""
        from routes.delete_missing_routes import perform_chi_square_test
        
        # Create series with different distributions
        before = pd.Series(['A'] * 20 + ['B'] * 20 + ['C'] * 20)  # Equal distribution
        after = pd.Series(['A'] * 50 + ['B'] * 5 + ['C'] * 5)     # Skewed distribution
        
        p_value = perform_chi_square_test(before, after)
        
        assert p_value < 0.05  # Should be significant
    
    def test_chi_square_test_no_difference(self):
        """Test Chi-square test with no difference."""
        from routes.delete_missing_routes import perform_chi_square_test
        
        # Create identical distributions
        before = pd.Series(['A'] * 20 + ['B'] * 20 + ['C'] * 20)
        after = pd.Series(['A'] * 20 + ['B'] * 20 + ['C'] * 20)
        
        p_value = perform_chi_square_test(before, after)
        
        assert p_value > 0.05  # Should not be significant
    
    def test_chi_square_test_insufficient_data(self):
        """Test Chi-square test with insufficient data."""
        from routes.delete_missing_routes import perform_chi_square_test
        
        before = pd.Series(['A', 'B', 'C'])
        after = pd.Series(['A', 'B'])
        
        p_value = perform_chi_square_test(before, after)
        
        assert p_value == 1.0  # Should return non-significant
    
    def test_chi_square_test_single_category(self):
        """Test Chi-square test with single category."""
        from routes.delete_missing_routes import perform_chi_square_test
        
        before = pd.Series(['A'] * 20)
        after = pd.Series(['A'] * 15)
        
        p_value = perform_chi_square_test(before, after)
        
        assert p_value == 1.0  # Should return non-significant


class TestVisualizationData:
    """Test visualization data generation functions."""
    
    def test_histogram_data_generation(self):
        """Test histogram data generation for numerical features."""
        from routes.delete_missing_routes import generate_histogram_data
        
        before = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        after = pd.Series([1, 2, 3, 4, 5])
        
        result = generate_histogram_data(before, after)
        
        assert "before" in result
        assert "after" in result
        assert "bins" in result["before"]
        assert "counts" in result["before"]
        assert len(result["before"]["bins"]) == 11  # 10 bins + 1
        assert len(result["before"]["counts"]) == 10
    
    def test_histogram_data_empty_series(self):
        """Test histogram data generation with empty series."""
        from routes.delete_missing_routes import generate_histogram_data
        
        before = pd.Series([])
        after = pd.Series([1, 2, 3])
        
        result = generate_histogram_data(before, after)
        
        assert result["before"]["bins"] == []
        assert result["before"]["counts"] == []
    
    def test_pie_chart_data_generation(self):
        """Test pie chart data generation for categorical features."""
        from routes.delete_missing_routes import generate_pie_chart_data
        
        before = pd.Series(['A', 'A', 'B', 'B', 'C', 'C'])
        after = pd.Series(['A', 'A', 'A', 'B'])
        
        result = generate_pie_chart_data(before, after)
        
        assert "before" in result
        assert "after" in result
        assert result["before"]["A"] == 2
        assert result["before"]["B"] == 2
        assert result["before"]["C"] == 2
        assert result["after"]["A"] == 3
        assert result["after"]["B"] == 1
    
    def test_pie_chart_data_empty_series(self):
        """Test pie chart data generation with empty series."""
        from routes.delete_missing_routes import generate_pie_chart_data
        
        before = pd.Series([])
        after = pd.Series(['A', 'B'])
        
        result = generate_pie_chart_data(before, after)
        
        assert result["before"] == {}
        assert result["after"] == {}


class TestAnalyzeFunction:
    """Test the main analyze_missing_data_impact function."""
    
    def setup_method(self):
        """Setup test data."""
        FEATURE_CACHE.clear()
        
        self.test_df = pd.DataFrame({
            'numeric_col': [1, 2, np.nan, 4, 5, 6, 7, 8, 9, 10],
            'categorical_col': ['A', 'B', None, 'A', 'B', 'A', 'B', 'A', 'B', 'A']
        })
        
        FEATURE_CACHE['numeric_col'] = Feature('numeric_col', 'N', 1, 10.0)
        FEATURE_CACHE['categorical_col'] = Feature('categorical_col', 'C', 1, 10.0)
    
    def test_analyze_missing_data_impact_success(self):
        """Test successful analysis."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        result = analyze_missing_data_impact(self.test_df)
        
        assert result["success"] is True
        assert result["rows_deleted"] == 1
        assert result["rows_remaining"] == 9
        assert result["total_original_rows"] == 10
        assert isinstance(result["affected_features"], list)
    
    def test_analyze_missing_data_impact_no_data(self):
        """Test analysis with no data."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        result = analyze_missing_data_impact(None)
        
        assert result["success"] is False
        assert "No dataset provided" in result["error"]
    
    def test_analyze_missing_data_impact_empty_dataframe(self):
        """Test analysis with empty dataframe."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        empty_df = pd.DataFrame()
        result = analyze_missing_data_impact(empty_df)
        
        assert result["success"] is False
        assert "empty" in result["error"]
    
    def test_analyze_missing_data_impact_no_missing(self):
        """Test analysis with no missing data."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        complete_df = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': ['A', 'B', 'C', 'D', 'E']
        })
        
        FEATURE_CACHE.clear()
        FEATURE_CACHE['col1'] = Feature('col1', 'N', 0, 0.0)
        FEATURE_CACHE['col2'] = Feature('col2', 'C', 0, 0.0)
        
        result = analyze_missing_data_impact(complete_df)
        
        assert result["success"] is True
        assert result["rows_deleted"] == 0
        assert result["rows_remaining"] == 5
    
    def test_analyze_missing_data_impact_all_rows_deleted(self):
        """Test analysis where all rows are deleted."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        all_missing_df = pd.DataFrame({
            'col1': [np.nan, np.nan, np.nan],
            'col2': [np.nan, np.nan, np.nan]
        })
        
        result = analyze_missing_data_impact(all_missing_df)
        
        assert result["success"] is False
        assert "All rows contain missing data" in result["error"]
    
    def test_analyze_missing_data_impact_cache_error(self):
        """Test analysis with cache initialization error."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        FEATURE_CACHE.clear()  # Empty cache
        
        with patch('routes.delete_missing_routes.initialize_feature_cache') as mock_init:
            mock_init.side_effect = Exception("Cache error")
            
            result = analyze_missing_data_impact(self.test_df)
            
            assert result["success"] is False
            assert "Failed to initialize feature cache" in result["error"]
    
    def test_analyze_missing_data_impact_memory_error(self):
        """Test analysis with memory error."""
        from routes.delete_missing_routes import analyze_missing_data_impact
        
        with patch.object(pd.DataFrame, 'copy') as mock_copy:
            mock_copy.side_effect = MemoryError("Out of memory")
            
            result = analyze_missing_data_impact(self.test_df)
            
            assert result["success"] is False
            assert "too large to process" in result["error"]


class TestEdgeCases:
    """Test edge cases for delete missing routes."""
    
    def test_single_row_analysis(self):
        """Test analysis with single row."""
        single_row_df = pd.DataFrame({'col1': [np.nan], 'col2': [1]})
        
        FEATURE_CACHE.clear()
        FEATURE_CACHE['col1'] = Feature('col1', 'N', 1, 100.0)
        FEATURE_CACHE['col2'] = Feature('col2', 'N', 0, 0.0)
        
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (single_row_df, None)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 500  # All rows deleted
            data = response.json()
            assert data["success"] is False
    
    def test_large_dataset_simulation(self):
        """Test with simulated large dataset characteristics."""
        # Create a dataset that would trigger certain edge cases
        large_df = pd.DataFrame({
            'col1': list(range(1000)) + [np.nan] * 100,
            'col2': ['A'] * 500 + ['B'] * 500 + [None] * 100
        })
        
        FEATURE_CACHE.clear()
        FEATURE_CACHE['col1'] = Feature('col1', 'N', 100, 9.09)
        FEATURE_CACHE['col2'] = Feature('col2', 'C', 100, 9.09)
        
        with patch('routes.delete_missing_routes.get_uploaded_dataframe') as mock_get_df:
            mock_get_df.return_value = (large_df, None)
            
            response = client.post("/api/delete-missing-data-analysis")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["rows_deleted"] == 100
            assert data["rows_remaining"] == 1000


if __name__ == "__main__":
    pytest.main([__file__])