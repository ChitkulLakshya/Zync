import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeamGatewayProps {
    title: string;
    description: string;
}

const TeamGateway = ({ title, description }: TeamGatewayProps) => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground max-w-sm mb-8">{description}</p>
            <Button onClick={() => navigate("/dashboard/people")}>
                Join or Create a Team
            </Button>
        </div>
    );
};

export default TeamGateway;
