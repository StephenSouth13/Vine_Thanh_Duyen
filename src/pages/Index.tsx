import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Users, CheckSquare, Calendar, TrendingUp, Shield, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const features = [
    {
      icon: Users,
      title: "Organization Management",
      description: "Manage teams, departments, and user hierarchy efficiently"
    },
    {
      icon: CheckSquare,
      title: "Attendance Tracking",
      description: "Real-time check-in/check-out with shift management"
    },
    {
      icon: Calendar,
      title: "Meeting Rooms",
      description: "Smart scheduling and resource allocation"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Role-based insights and performance reporting"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Enterprise-grade security with row-level access control"
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Live notifications and instant data synchronization"
    }
  ];

  return (
    <div className="min-h-screen gradient-secondary">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 animate-fade-in">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-strong">
              <Leaf className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
            Vine HRM
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            Enterprise Resource Management Platform
          </p>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Modern, powerful, and intelligent HRM system designed for internal business operations. 
            Streamline attendance, tasks, meetings, and team management all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 shadow-medium hover:shadow-strong transition-smooth"
              onClick={() => navigate("/auth/login")}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
              onClick={() => navigate("/auth/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to streamline your business operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 rounded-xl bg-card border border-border shadow-soft hover:shadow-medium transition-smooth animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-card rounded-2xl p-12 shadow-strong border border-border">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join your team on Vine HRM and start managing your work more efficiently
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 shadow-medium hover:shadow-strong transition-smooth"
            onClick={() => navigate("/auth/login")}
          >
            Access Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 Vine HRM. by Thanh Duyen</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
