"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

// Helper cn function (if not using lib/utils)
function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]): string {
  return inputs
    .flat()
    .filter(x => x !== null && x !== undefined && typeof x !== 'boolean')
    .map(x => typeof x === 'string' ? x : Object.entries(x as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k))
    .flat()
    .join(' ');
}

// Tipos para los datos de ejemplo (con mensajes)
interface MockMessage {
  sender: "user" | "agent" | "system";
  text: string;
  timestamp: string;
}

interface MockConversation {
  id: string;
  contactName: string;
  contactInitial: string;
  lastMessagePreview: string;
  timestamp: string;
  status: "Open" | "Pending" | "Closed";
  assignee: string | null;
  tags: string[];
  tab: "All" | "Requires Agent" | "My Tasks" | "Queue" | "Sofia AI";
  timer?: string;
  notes?: string;
  channel?: 'whatsapp' | 'sms';
  messages: MockMessage[]; // Array de mensajes
}

// Datos de Ejemplo con Mensajes Simulados
const mockConversations: MockConversation[] = [
  // 1. Manual Rule Success
  {
    id: "conv-1",
    contactName: "Leticia Torres", contactInitial: "L", lastMessagePreview: "Quiero devolver este producto...", timestamp: "Apr 09", status: "Open", assignee: "Returns Team", tags: ["#32", "Manual Rule"], tab: "All", notes: "Matched manual rule for tag 'Return'", channel: 'whatsapp',
    messages: [
      { sender: "user", text: "Hola, compré una camiseta la semana pasada pero no me queda bien.", timestamp: "Apr 09 10:15" },
      { sender: "user", text: "Quiero devolver este producto y obtener un reembolso.", timestamp: "Apr 09 10:16" },
      { sender: "system", text: "Ticket assigned to Returns Team based on rule 'Return, Refund'.", timestamp: "Apr 09 10:17" },
      { sender: "agent", text: "Hola Leticia, claro, podemos ayudarte con la devolución. ¿Tienes el número de pedido?", timestamp: "Apr 09 10:25" }
    ]
  },
  // 2. Round Robin Success
  {
    id: "conv-2",
    contactName: "Mark", contactInitial: "M", lastMessagePreview: "¡Hola! 👋 Vimos que te interesa estudiar en ULA...", timestamp: "Apr 08", status: "Open", assignee: "Andreas", tags: ["#65", "Round Robin"], tab: "All", notes: "Assigned via Round Robin routing", channel: 'whatsapp',
    messages: [
      { sender: "agent", text: "¡Hola! 👋 Vimos que te interesa estudiar en ULA. ¿Te gustaría recibir más información sobre tu carrera?", timestamp: "Apr 08 14:30" },
      { sender: "user", text: "Sí, por favor.", timestamp: "Apr 08 14:32" },
      { sender: "system", text: "Ticket assigned to Andreas via Round Robin.", timestamp: "Apr 08 14:33" }
    ]
  },
   // 3. AI Success (Standard Factors)
  {
    id: "conv-3",
    contactName: "Héloise from Connectly.ai", contactInitial: "HC", lastMessagePreview: "Hola Helo 👋, Te regalamos $10.000 usando el cupon...", timestamp: "Apr 09", status: "Open", assignee: "Joscha", tags: ["#67", "Requires Agent", "AI Routing"], tab: "Requires Agent", notes: "Assigned by AI based on sentiment/topic/history", channel: 'whatsapp',
    messages: [
      { sender: "user", text: "Hola Helo 👋, Te regalamos $10.000 usando el cupon CARRITO10 en compras mínimas de $60.000 ¿Lista para darle a tu piel un boost d...", timestamp: "Apr 09 09:10" },
      { sender: "user", text: "¡Suena genial! ¿Cómo lo uso?", timestamp: "Apr 09 09:11" },
      { sender: "system", text: "AI routing: High purchase intent detected. Assigning to Sales Agent Joscha based on performance with similar leads.", timestamp: "Apr 09 09:12" },
      { sender: "agent", text: "¡Hola Héloise! Soy Joscha, ¡claro que sí! Es muy fácil, solo agrégalo al finalizar tu compra.", timestamp: "Apr 09 09:18"}
    ]
  },
  // 4. Pre-Assignment with Timer
  {
    id: "conv-4",
    contactName: "Busy Client", contactInitial: "BC", lastMessagePreview: "Need urgent help with my account!", timestamp: "10:35 AM", status: "Pending", assignee: "Santiago Soler", tags: ["#91", "Pre-assigned"], tab: "My Tasks", timer: "Assign in 4:15", notes: "Pre-assigned to Santiago due to high workload (threshold reached).",
    messages: [
      { sender: "user", text: "My account is blocked, I can't log in!", timestamp: "10:34 AM" },
      { sender: "user", text: "Need urgent help with my account!", timestamp: "10:35 AM" },
      { sender: "system", text: "AI routing: Agent Santiago Soler has 3 open tickets. Pre-assigning with 5 min timer.", timestamp: "10:35 AM" },
      { sender: "system", text: "Ticket will be assigned to Santiago Soler in 4:15.", timestamp: "10:36 AM" } // Simulate timer update visibility
    ]
  },
   // 5. AI Insufficient Info -> Round-Robin Fallback Enabled
  {
    id: "conv-5",
    contactName: "+13312583712", contactInitial: "1", lastMessagePreview: "minha pequenininha filhote", timestamp: "Apr 08", status: "Open", assignee: "Sofia Caorsi", tags: ["#38", "RR Fallback"], tab: "All", notes: "AI lacked info, assigned via Round-Robin Fallback.", channel: 'sms',
    messages: [
      { sender: "user", text: "minha pequenininha filhote", timestamp: "Apr 08 18:20" },
      { sender: "system", text: "AI routing: Insufficient information to determine intent. Round-Robin Fallback enabled.", timestamp: "Apr 08 18:21" },
      { sender: "system", text: "Ticket assigned to Sofia Caorsi via Round-Robin Fallback.", timestamp: "Apr 08 18:21" }
    ]
  },
  // 6. AI Insufficient Info -> Send to Queue (RR Fallback Disabled)
  {
    id: "conv-6",
    contactName: "Vague Questioner", contactInitial: "VQ", lastMessagePreview: "Hello?", timestamp: "10:50 AM", status: "Open", assignee: null, tags: ["#102", "Missing Information"], tab: "Queue", notes: "AI lacked info, sent to Queue (RR Fallback disabled).",
    messages: [
      { sender: "user", text: "Hello?", timestamp: "10:50 AM" },
      { sender: "system", text: "AI routing: Insufficient information. Round-Robin Fallback disabled. Sending to Queue with tag 'Missing Information'.", timestamp: "10:51 AM" }
    ]
  },
   // 7. Equitable Distribution Influence
   {
    id: "conv-7",
    contactName: "Tech Support Req", contactInitial: "TS", lastMessagePreview: "My system is down, need help!", timestamp: "11:05 AM", status: "Open", assignee: "Ana García", tags: ["#105", "AI Routing", "Equitable"], tab: "All", notes: "AI preferred Carlos (skills), but assigned Ana due to equitable distribution (Carlos had 2+ more tickets).",
    messages: [
      { sender: "user", text: "Help, my internet connection stopped working suddenly!", timestamp: "11:04 AM" },
      { sender: "user", text: "My system is down, need help!", timestamp: "11:05 AM" },
      { sender: "system", text: "AI routing: Match for 'Technical Support'. Agent Carlos López has high skill match, but 3 open tickets. Agent Ana García has 1 open ticket.", timestamp: "11:06 AM" },
      { sender: "system", text: "Equitable Distribution enabled (max diff 2): Assigning to Ana García.", timestamp: "11:06 AM" }
    ]
  },
  // 8. General Condition Fail
  {
    id: "conv-8",
    contactName: "Night Owl", contactInitial: "NO", lastMessagePreview: "Is anyone available now?", timestamp: "11:55 PM", status: "Open", assignee: null, tags: ["#108", "Outside Business Hours"], tab: "All", notes: "Routing failed due to Business Hours condition.",
    messages: [
       { sender: "user", text: "Is anyone available now?", timestamp: "11:55 PM" },
       { sender: "system", text: "General Condition Check: Failed 'Business Hours' condition. Fallback message triggered.", timestamp: "11:56 PM" },
       { sender: "agent", text: "Our business hours have ended. We will attend to you as soon as we resume operations.", timestamp: "11:56 PM" } // Fallback message example
    ]
  },
  // 9. Example handled by Sofia AI
  {
    id: "conv-9",
    contactName: "Chatbot User", contactInitial: "CU", lastMessagePreview: "Thanks Sofia!", timestamp: "Apr 09", status: "Open", assignee: "Sofia AI", tags: ["#45", "AI Handled"], tab: "Sofia AI", notes: "Conversation fully handled by Sofia AI.",
    messages: [
        { sender: "user", text: "What are your opening hours?", timestamp: "Apr 09 14:00" },
        { sender: "agent", text: "We are open Monday to Friday, 9 AM to 5 PM.", timestamp: "Apr 09 14:01" },
        { sender: "user", text: "Thanks Sofia!", timestamp: "Apr 09 14:02" }
    ]
  },
];

// Componente Principal del Mockup
export default function InboxMockup() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null); // State for selected convo

  const filteredConversations = mockConversations.filter(conv => {
    if (activeTab === "All") return true;
    if (activeTab === "Requires Agent") return conv.tags.includes("Requires Agent");
    if (activeTab === "My Tasks") return conv.tab === "My Tasks";
    if (activeTab === "Queue") return conv.tab === "Queue";
    if (activeTab === "Sofia AI") return conv.assignee === "Sofia AI";
    return false;
  });

  const selectedConversation = mockConversations.find(conv => conv.id === selectedConversationId);

  return (
    <Card className="w-full h-[calc(100vh-4rem)] flex flex-col"> {/* Adjust height based on layout */}
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg">Inbox Mockup</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Lista de Conversaciones */}
          <div className="w-1/3 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                 {/* Tab Triggers */}
                <TabsTrigger value="All" className="text-xs px-1">All</TabsTrigger>
                <TabsTrigger value="Requires Agent" className="text-xs px-1">Requires Agent</TabsTrigger>
                <TabsTrigger value="My Tasks" className="text-xs px-1">My Tasks</TabsTrigger>
                <TabsTrigger value="Queue" className="text-xs px-1">Queue</TabsTrigger>
                <TabsTrigger value="Sofia AI" className="text-xs px-1">Sofia AI</TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Wrap conversation list in ScrollArea */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={selectedConversationId === conv.id} // Pass isSelected prop
                      onSelect={() => setSelectedConversationId(conv.id)} // Pass handler
                    />
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground p-4">No conversations in this view.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Detalle de Conversación */}
          <div className="w-2/3 flex flex-col h-full">
            {selectedConversation ? (
              <ConversationDetail conversation={selectedConversation} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/30">
                <p className="text-center text-muted-foreground">Select a conversation to view details</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para un item de conversación en la lista
function ConversationItem({ conversation, isSelected, onSelect }: { conversation: MockConversation; isSelected: boolean; onSelect: () => void }) {
  return (
    <Card
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer",
        isSelected && "bg-muted/80 border-purple-300" // Style for selected item
      )}
      onClick={onSelect} // Add onClick handler
    >
      <div className="flex items-start space-x-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-purple-100 text-purple-700">{conversation.contactInitial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1 overflow-hidden">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium leading-none truncate">{conversation.contactName}</p>
            <p className="text-xs text-muted-foreground">{conversation.timestamp}</p>
          </div>
          <p className="text-sm text-muted-foreground truncate">{conversation.lastMessagePreview}</p>
          <div className="flex items-center justify-between pt-1">
             <div className="flex flex-wrap gap-1">
                {conversation.tags.map(tag => (
                    <Badge
                        key={tag}
                        variant={tag.startsWith("#") ? "secondary" : "outline"}
                        className={cn("text-xs px-1.5 py-0.5", {
                            "bg-yellow-100 text-yellow-800 border-yellow-200": tag === "Requires Agent",
                            "bg-red-100 text-red-800 border-red-200": tag === "Missing Information",
                            "bg-blue-100 text-blue-800 border-blue-200": tag === "Pre-assigned",
                            "bg-gray-100 text-gray-600 border-gray-200": tag === "RR Fallback",
                            "bg-green-100 text-green-800 border-green-200": tag === "AI Routing",
                            "bg-purple-100 text-purple-800 border-purple-200": tag === "Manual Rule",
                        })}
                    >
                        {tag}
                    </Badge>
                ))}
             </div>
             {conversation.assignee && conversation.assignee !== "Queue" && conversation.assignee !== "Sofia AI" && (
                 <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-medium ml-1 shrink-0">{conversation.assignee}</Badge>
             )}
             {conversation.timer && (
                 <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-blue-600 border-blue-200 ml-1 shrink-0">{conversation.timer}</Badge>
             )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Nuevo componente para mostrar el detalle de la conversación
function ConversationDetail({ conversation }: { conversation: MockConversation }) {
  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header del detalle */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
            <h3 className="font-semibold">{conversation.contactName}</h3>
            {conversation.assignee && <span className="text-xs text-muted-foreground">Assigned to: {conversation.assignee}</span>}
            {!conversation.assignee && conversation.tags.includes("Missing Information") && <span className="text-xs text-red-600">In Queue (Missing Info)</span>}
            {!conversation.assignee && conversation.tags.includes("Outside Business Hours") && <span className="text-xs text-amber-600">Waiting (Outside Hours)</span>}
        </div>
        {/* Actions like close, assign etc. could go here */} 
        <Badge variant="secondary" className="text-xs">{conversation.status}</Badge>
      </div>

      {/* Área de mensajes */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.messages.map((msg, index) => (
            <div
              key={index}
              className={cn("flex", {
                "justify-end": msg.sender === "user",
                "justify-start": msg.sender === "agent" || msg.sender === "system",
              })}
            >
              <div
                className={cn("p-2 rounded-lg max-w-[75%] text-sm", {
                  "bg-purple-600 text-white": msg.sender === "user",
                  "bg-muted": msg.sender === "agent",
                  "bg-blue-100 text-blue-800 text-xs italic border border-blue-200 w-full text-center py-1": msg.sender === "system",
                })}
              >
                <p>{msg.text}</p>
                {msg.sender !== "system" && <p className="text-xs opacity-70 text-right mt-1">{msg.timestamp}</p>}
                {msg.sender === "system" && <p className="text-xs opacity-70 text-center mt-0.5">{msg.timestamp}</p>}
              </div>
            </div>
          ))}
           {/* Display internal notes for clarity in mockup */}
           {conversation.notes && (
               <div className="text-xs text-center italic text-muted-foreground p-2 border-t mt-4">
                  Note: {conversation.notes}
               </div>
           )}
        </div>
      </ScrollArea>

      {/* Área de input (Placeholder) */}
      <div className="p-4 border-t">
        {/* Placeholder for input */}
      </div>
    </div>
  );
}
