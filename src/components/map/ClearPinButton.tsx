
interface ClearPinButtonProps {
  isVisible: boolean;
  onClear: () => void;
}

const ClearPinButton = ({ isVisible, onClear }: ClearPinButtonProps) => {
  if (!isVisible) return null;
  
  return (
    <button 
      onClick={onClear}
      className="absolute bottom-4 right-4 z-10 bg-white/80 backdrop-blur-sm py-1 px-2 rounded text-xs text-red-500 hover:bg-white/90 transition-colors"
    >
      Clear pin
    </button>
  );
};

export default ClearPinButton;
