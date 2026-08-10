import React, { useEffect, useState } from 'react';
import ArchitectureMap from './ArchitectureMap';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, Layers, Zap, X, Send, RefreshCw, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { architectureQueue } from '@/lib/architectureQueue';
import { fetchWithRetry } from '@/lib/retryHelper';

const ArchitectureView: React.FC<{ project?: any }> = ({ project }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<any>(project || null);
  const [loading, setLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system'; content: string; type?: 'suggestion' }>>([
    { 
      role: 'assistant', 
      content: "I'm your Architecture Agent! I can help you modify or regenerate this architecture. You can ask me to:\n\n• Add new components\n• Remove services\n• Change the tech stack\n• Regenerate the entire architecture\n• Explain design decisions",
      type: 'suggestion'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (project || !id) {return;}
    setLoading(true);
    const fetchProject = async () => {
      try {
        const { auth } = await import('@/lib/firebase');
        const token = await auth.currentUser?.getIdToken?.();
        if (!token) {throw new Error('No auth token');}
        const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {throw new Error(`Failed to fetch project: ${res.status}`);}
        const data = await res.json();
        setProjectData(data);
      } catch (e) {
        console.error('Failed to load project for architecture:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [project, id]);

  const architecture = projectData?.architecture || {};
  const highLevel = architecture.highLevel || 'No architecture description available.';
  const frontend = architecture.frontend || {};
  const backend = architecture.backend || {};
  const database = architecture.database || {};
  const integrations = architecture.integrations || [];
  const projectId = projectData?._id || projectData?.id;

  const pageCount = frontend.pages?.length || 0;
  const apiCount = backend.apis?.length || 0;
  const collectionCount = database.collections?.length || 0;
  const techCount = integrations.length;

  const handleSendMessage = async () => {
    if (!chatInput.trim()) {
      return;
    }
    
    const userMessage = chatInput.trim();
    console.log('Sending message:', userMessage);
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI agent response
    setTimeout(() => {
      const lowerMessage = userMessage.toLowerCase();
      let response = '';
      let isAction = false;

      // Handle regeneration request
      if (lowerMessage.includes('regenerate') || lowerMessage.includes('regen') || lowerMessage.includes('new architecture') || lowerMessage.includes('start over')) {
        response = "I'll regenerate the architecture for you. This will analyze the repository again and create a fresh architecture diagram. Shall I proceed?";
        isAction = true;
      }
      // Handle add component requests
      else if (lowerMessage.includes('add') || lowerMessage.includes('include') || lowerMessage.includes('add component')) {
        response = "To add a component, please specify what you'd like to add. For example:\n• 'Add a caching service'\n• 'Include a message queue'\n• 'Add authentication service'\n\nI'll then update the architecture accordingly.";
      }
      // Handle remove component requests
      else if (lowerMessage.includes('remove') || lowerMessage.includes('delete') || lowerMessage.includes('take out')) {
        response = "I can help remove components. Which service or component would you like me to remove from the architecture?";
        isAction = true;
      }
      // Handle tech stack changes
      else if (lowerMessage.includes('change tech') || lowerMessage.includes('different tech') || lowerMessage.includes('use') && lowerMessage.includes('instead')) {
        response = "I can help you change the tech stack. What technology would you like to use instead of the current ones?";
        isAction = true;
      }
      // Handle scaling requests
      else if (lowerMessage.includes('scale') || lowerMessage.includes('more scalable') || lowerMessage.includes('handle more')) {
        response = "To make this architecture more scalable, I suggest:\n\n• Add a load balancer\n• Implement caching layer\n• Use message queues for async processing\n• Add database read replicas\n\nWould you like me to implement any of these changes?";
        isAction = true;
      }
      // Handle security requests
      else if (lowerMessage.includes('security') || lowerMessage.includes('secure') || lowerMessage.includes('protect')) {
        response = "To improve security, I recommend:\n\n• Add API rate limiting\n• Implement authentication/authorization\n• Add input validation\n• Use HTTPS everywhere\n• Add logging and monitoring\n\nShould I add these security layers?";
        isAction = true;
      }
      // Handle explanation requests
      else if (lowerMessage.includes('explain') || lowerMessage.includes('why') || lowerMessage.includes('how')) {
        response = `This architecture is designed as ${highLevel || 'a modern application structure'}.\n\n**Frontend**: ${frontend.structure || 'Uses modern web technologies'} with ${pageCount} pages\n**Backend**: ${backend.structure || 'Provides API services'} with ${apiCount} endpoints\n**Database**: ${database.design || 'Handles data persistence'} with ${collectionCount} collections\n\nThe tech stack includes: ${integrations.slice(0, 5).join(', ') || 'various modern technologies'}.`;
      }
      // Default response
      else {
        response = "I can help you modify this architecture. Try asking me to:\n\n• 'Regenerate the architecture'\n• 'Add a caching service'\n• 'Remove the message queue'\n• 'Make it more scalable'\n• 'Explain the design'\n\nWhat would you like to change?";
      }
      
      console.log('AI response:', response);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response, type: isAction ? 'suggestion' : undefined }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    console.log('Quick action clicked:', action);
    if (action === 'Regenerate the architecture') {
      handleRegenerateArchitecture();
    } else {
      setChatInput(action);
      handleSendMessage();
    }
  };

  const handleRegenerateArchitecture = async () => {
    console.log('Regenerating architecture for project:', projectId);
    if (!projectId) {
      return;
    }
    setIsRegenerating(true);
    setChatMessages(prev => [...prev, { role: 'system', content: 'Regenerating architecture...' }]);
    
    try {
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken?.();
      if (!token) {throw new Error('No auth token');}

      // Use queue for controlled concurrency + retry logic
      const analyzedProject = await architectureQueue.add(async () => {
        const res = await fetchWithRetry(
          `${API_BASE_URL}/api/projects/${projectId}/analyze-architecture?provider=kilo&forceRefresh=true`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000
          }
        );

        return await res.json();
      }, `regenerate-${projectId}`);

      const analyzedArch = analyzedProject?.architecture;
      
      if (analyzedArch && analyzedArch.highLevel) {
        setProjectData((prev: any) => ({ ...prev, architecture: analyzedArch }));
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '✅ Architecture regenerated successfully! The new architecture has been applied to the diagram.',
          type: 'suggestion'
        }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'system', content: '❌ Failed to regenerate architecture. No architecture data returned.' }]);
      }
    } catch (error: any) {
      console.error('Regeneration failed:', error);
      setChatMessages(prev => [...prev, { role: 'system', content: `❌ Failed to regenerate: ${error.message}` }]);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/workspace')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Architecture</h1>
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'Loading...'
                : projectData?.githubRepoOwner && projectData?.githubRepoName
                  ? `${projectData.githubRepoOwner}/${projectData.githubRepoName}`
                  : 'Project'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-2">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{pageCount}</span> pages
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{apiCount}</span> APIs
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{collectionCount}</span> collections
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{techCount}</span> tech
            </span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {architecture ? 'Analyzed' : 'Not Analyzed'}
          </Badge>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setInfoOpen(true)}
            className="h-8 w-8"
            title="Architecture details"
          >
            <Info className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log('Agent button clicked, current chatOpen:', chatOpen);
              setChatOpen(!chatOpen);
            }}
            className="h-8 w-8"
            title="Architecture Agent"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Diagram Area */}
        <div className="flex-1 relative">
          <ArchitectureMap project={projectData} />
          
          {/* Floating Quick Info Panel for Mobile */}
          {architecture && (
            <div className="absolute bottom-4 left-4 md:hidden">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 bg-surface-glass-regular backdrop-blur-regular border border-border/50"
                onClick={() => setInfoOpen(true)}
              >
                <Info className="w-4 h-4" />
                <span className="text-xs">Details</span>
              </Button>
            </div>
          )}
          
          {/* Mobile AI Agent Button */}
          {architecture && (
            <div className="absolute bottom-4 right-4 md:hidden">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 bg-surface-glass-regular backdrop-blur-regular border border-border/50"
                onClick={() => setChatOpen(true)}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs">Agent</span>
              </Button>
            </div>
          )}
        </div>
        
        {/* AI Chat Panel */}
        {chatOpen && (
          <div className="w-80 border-l border-border/50 bg-background/30 backdrop-blur-sm flex flex-col transition-all duration-300">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Architecture Agent</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(false)}
                className="h-6 w-6"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.role === 'system'
                          ? 'bg-muted text-muted-foreground border border-border/30'
                          : 'bg-surface-glass-regular backdrop-blur-regular border border-border/30 text-foreground'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-surface-glass-regular backdrop-blur-regular border border-border/30 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Quick Actions */}
            <div className="p-3 border-t border-border/50">
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  onClick={() => handleQuickAction('Regenerate the architecture')}
                  disabled={isRegenerating}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  onClick={() => handleQuickAction('Make it more scalable')}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Scale
                </Button>
                <Button
                  onClick={() => handleQuickAction('Add security layers')}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Secure
                </Button>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Describe changes..."
                  value={chatInput}
                  onChange={(e) => {
                    console.log('Input changed:', e.target.value);
                    setChatInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    console.log('Key pressed:', e.key);
                    if (e.key === 'Enter') {
                      console.log('Enter key pressed, sending message');
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 text-xs bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={() => {
                    console.log('Send button clicked');
                    handleSendMessage();
                  }}
                  disabled={!chatInput.trim() || isTyping}
                  size="icon"
                  className="h-8 w-8"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Details Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Architecture Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Overview */}
            <Card className="bg-surface-glass-regular backdrop-blur-regular border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {highLevel}
                </p>
              </CardContent>
            </Card>

            {/* Components */}
            <Card className="bg-surface-glass-regular backdrop-blur-regular border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Components
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Frontend */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Frontend</span>
                    <Badge variant="outline" className="text-[10px]">Client</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {frontend.structure || 'Not specified'}
                  </p>
                  {frontend.pages && frontend.pages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-2">Pages ({frontend.pages.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {frontend.pages.map((page: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {page}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Backend */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Backend</span>
                    <Badge variant="outline" className="text-[10px]">Server</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {backend.structure || 'Not specified'}
                  </p>
                  {backend.apis && backend.apis.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-2">APIs ({backend.apis.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {backend.apis.map((api: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {api}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Database */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database</span>
                    <Badge variant="outline" className="text-[10px]">Data</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {database.design || 'Not specified'}
                  </p>
                  {database.collections && database.collections.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-2">Collections ({database.collections.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {database.collections.map((collection: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {collection}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            {integrations.length > 0 && (
              <Card className="bg-surface-glass-regular backdrop-blur-regular border-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Tech Stack
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {integrations.map((tech: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArchitectureView;
