import React from "react";

interface PaginationControlsProps {
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
    loading: boolean;
    onPageChange: (page: number, limit: number) => void;
    itemName?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
    pagination,
    loading,
    onPageChange,
    itemName = "items"
}) => {
    if (pagination.total === 0) return null;

    return (
        <div className="flex items-center justify-between mt-5">
            <div className="text-sm text-gray-600">
                Showing {pagination.page * pagination.limit + 1}-{Math.min((pagination.page + 1) * pagination.limit, pagination.total)} of {pagination.total} {itemName}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(pagination.page - 1, pagination.limit)}
                    disabled={!pagination.has_prev || loading}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-600">
                    Page {pagination.page + 1} of {pagination.total_pages}
                </span>
                <button
                    onClick={() => onPageChange(pagination.page + 1, pagination.limit)}
                    disabled={!pagination.has_next || loading}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;