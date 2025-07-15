import React from 'react';

const FeatureCountCard: React.FC = () => (
  <div className="rounded-2xl border bg-white shadow-sm flex flex-col items-center p-6 min-h-[150px]">
    <div className="text-xs text-gray-500 mb-2 text-center">Total number of Features with missing data</div>
    <div className="text-2xl font-semibold mb-1 text-center">10 (20%)</div>
  </div>
);

export default FeatureCountCard; 