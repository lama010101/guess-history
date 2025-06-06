
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TestPlayPage = () => {
  return (
    <div className="p-8 flex flex-col items-center space-y-6">
      <Link to="/test/game?mode=solo">
        <Button size="lg" className="w-48">SOLO</Button>
      </Link>
      <Link to="/test/game?mode=multi">
        <Button size="lg" className="w-48">MULTI</Button>
      </Link>
      <Link to="/test/game?mode=daily">
        <Button size="lg" className="w-48">DAILY</Button>
      </Link>
    </div>
  );
};

export default TestPlayPage;
