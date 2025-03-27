import { X } from 'lucide-react';
export interface ClearPinButtonProps {
  onClear: () => void;
}
const ClearPinButton = ({
  onClear
}: ClearPinButtonProps) => {
  return <button onClick={onClear} className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-lg z-20 hover:bg-background transition-colors" aria-label="Clear pin">
      
    </button>;
};
export default ClearPinButton;