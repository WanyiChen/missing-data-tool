import React from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const MechanismCard: React.FC = () => (
  <div className="rounded-2xl border bg-white shadow-sm flex flex-col items-center p-6 min-h-[150px]">
    <div className="text-xs text-gray-500 mb-2 text-center">Possible missing data mechanisms</div>
    <div className="text-xl font-semibold mb-1 text-center flex items-center justify-center gap-1">
      MAR or MNAR
      <InfoOutlinedIcon
        fontSize="small"
        className="text-gray-400 cursor-pointer"
        titleAccess="Missing at Random or Missing Not at Random"
      />
    </div>
    <div className="text-xs text-gray-500 text-center">(Missing at Random or Missing Not at Random)</div>
  </div>
);

export default MechanismCard; 