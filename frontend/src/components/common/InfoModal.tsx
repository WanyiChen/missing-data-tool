export default function InfoModal({
    message,
    onClose,
}: {
    message: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 flex flex-col items-center justify-center min-h-[200px]">
                <button
                    className="cursor-pointer absolute top-4 right-4 text-gray-500 hover:text-black text-2xl font-bold"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                <div className="text-gray-800 text-left">{message}</div>
            </div>
        </div>
    );
}
