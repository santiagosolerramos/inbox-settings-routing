"use client"

import { useState, createContext } from "react"
import { GripVertical, Sparkles, Plus, Edit, Trash2, PlusCircle } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Datos de ejemplo
const SAMPLE_TAGS = ["Soporte", "Ventas", "Facturación", "Técnico", "Devolución", "Envío", "Producto"]
const SAMPLE_TOPICS = [
  "Problema técnico",
  "Consulta de factura",
  "Cambio de producto",
  "Estado de envío",
  "Cancelación",
]
const SAMPLE_TEAMS = ["Soporte Técnico", "Atención al Cliente", "Ventas", "Logística", "Devoluciones"]
const SAMPLE_AGENTS = [
  { id: 1, name: "Ana García", team: "Soporte Técnico" },
  { id: 2, name: "Carlos López", team: "Soporte Técnico" },
  { id: 3, name: "María Rodríguez", team: "Atención al Cliente" },
  { id: 4, name: "Juan Martínez", team: "Atención al Cliente" },
  { id: 5, name: "Laura Sánchez", team: "Ventas" },
  { id: 6, name: "Pedro Ramírez", team: "Ventas" },
  { id: 7, name: "Sofía Torres", team: "Logística" },
  { id: 8, name: "Diego Flores", team: "Devoluciones" },
]
const SAMPLE_COUNTRIES = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
]

interface SubCondition {
  conditionType: string;
  conditionValue: string;
}

interface RoutingCondition {
  id: number;
  name: string;
  conditionType: string;
  conditionValue: string;
  subconditions: SubCondition[] | null;
  operator: string | null;
  assignType: string;
  assignValue: string;
  specificAgent: string | null;
}

interface TicketLimitCondition {
  limit: number;
  min: number;
  max: number;
  randomAssign?: boolean;
  currentDistribution?: AgentDistribution[];
}

interface BusinessHoursCondition {
  hours: {
    [key: string]: string;
  };
  timezone: string;
}

type GeneralConditionType = OnlineCondition | BusinessHoursCondition | TicketLimitCondition;

interface SubConditionProps {
  condition: SubCondition;
  index: number;
  onRemove: (index: number) => void;
}

interface RoutingConditionItemProps {
  condition: RoutingCondition;
  onEdit: (condition: RoutingCondition) => void;
  onDelete: (id: number) => void;
}

interface RoutingConditionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (condition: RoutingCondition) => void;
  editingCondition: RoutingCondition | null;
}

interface DragItemProps {
  condition: SubCondition;
  index: number;
}

interface DragListProps {
  conditions: SubCondition[];
  setConditions: React.Dispatch<React.SetStateAction<SubCondition[]>>;
}

const DragContext = createContext<DragListProps | null>(null)

// Componente para mostrar una subcondición
const SubCondition = ({ condition, index, onRemove }: SubConditionProps) => {
  return (
    <div className="p-3 border rounded-md mb-2 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
              {condition.conditionType}
            </Badge>
            <span className="text-sm font-medium">{condition.conditionValue}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-8 w-8 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Componente para mostrar una condición de routing guardada
const RoutingConditionItem = ({ condition, onEdit, onDelete }: RoutingConditionItemProps) => {
  return (
    <div className="p-3 border rounded-md mb-2 bg-white">
      <div className="flex justify-between items-start">
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            {condition.subconditions && condition.subconditions.length > 0 ? (
              <Badge className="bg-purple-600">Condición compuesta</Badge>
            ) : (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
                {condition.conditionType}
              </Badge>
            )}

            {!condition.subconditions && <span className="text-sm font-medium">{condition.conditionValue}</span>}
          </div>

          {condition.subconditions && condition.subconditions.length > 0 && (
            <div className="pl-3 border-l-2 border-purple-200 mb-3">
              <p className="text-xs text-muted-foreground mb-2">
                Condiciones combinadas (
                {condition.operator === "AND" ? "todas deben cumplirse" : "al menos una debe cumplirse"}):
              </p>
              <div className="space-y-1">
                {condition.subconditions.map((subcondition, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                      {subcondition.conditionType}
                    </Badge>
                    <span className="text-xs">{subcondition.conditionValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Asignar a: {condition.assignType === "team" ? "Equipo" : "Agente"} - {condition.assignValue}
            {condition.assignType === "team" && condition.specificAgent && <span> ({condition.specificAgent})</span>}
          </div>
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(condition)} className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(condition.id)}
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface RuleCondition {
  type: string;
  operator: string;
  value: string;
}

interface Rule {
  id: number;
  name: string;
  conditions: RuleCondition[];
  combinator: "AND" | "OR";
  assignType: string;
  assignValue: string;
  specificAgent: string | null;
}

const RoutingConditionForm = ({ isOpen, onClose, onSave, editingCondition = null }: RoutingConditionFormProps) => {
  const [name, setName] = useState(editingCondition?.name || "")
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { type: "message", operator: "contains", value: "" }
  ])
  const [combinator, setCombinator] = useState<"AND" | "OR">("AND")

  // Estado para asignación
  const [assignType, setAssignType] = useState(editingCondition?.assignType || "team")
  const [selectedTeam, setSelectedTeam] = useState(
    editingCondition?.assignType === "team" ? editingCondition.assignValue : ""
  )
  const [assignToSpecific, setAssignToSpecific] = useState(editingCondition?.specificAgent ? true : false)
  const [specificAgent, setSpecificAgent] = useState(editingCondition?.specificAgent || "")
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    editingCondition?.assignType === "agent" ? editingCondition.assignValue.split(", ") : []
  )

  // Filtrar agentes por equipo seleccionado
  const filteredAgents = selectedTeam ? SAMPLE_AGENTS.filter((agent) => agent.team === selectedTeam) : SAMPLE_AGENTS

  const addCondition = () => {
    setConditions([...conditions, { type: "message", operator: "contains", value: "" }])
  }

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index))
    }
  }

  const updateCondition = (index: number, field: keyof RuleCondition, value: string) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    setConditions(newConditions)
  }

  const handleSave = () => {
    // Validar que se haya ingresado un nombre
    if (!name.trim()) {
      alert("Por favor, ingresa un nombre para la regla")
      return
    }

    // Validar que todas las condiciones tengan valores
    if (conditions.some(c => !c.value)) {
      alert("Por favor, completa todos los valores de las condiciones")
      return
    }

    // Validar que se haya seleccionado un equipo o agente
    if (!selectedTeam && selectedAgents.length === 0) {
      alert("Por favor, selecciona un equipo o agente para asignar")
      return
    }

    // Validar que si se seleccionó asignar a un agente específico, se haya seleccionado el agente
    if (assignToSpecific && !specificAgent) {
      alert("Por favor, selecciona un agente específico")
      return
    }

    const finalAssignValue = assignType === "team" ? selectedTeam : selectedAgents.join(", ")

    onSave({
      id: editingCondition?.id || Date.now(),
      name,
      conditionType: "rule",
      conditionValue: JSON.stringify({ conditions, combinator }),
      subconditions: null,
      operator: combinator,
      assignType,
      assignValue: finalAssignValue,
      specificAgent: assignToSpecific ? specificAgent : null,
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCondition ? "Editar regla" : "Crear nueva regla"}</DialogTitle>
          <DialogDescription>
            Define las condiciones y asignación para esta regla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Nombre de la regla</Label>
            <Input
              placeholder="Ej: Tickets de soporte técnico"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            </div>
            
          <div className="space-y-4 bg-slate-50 p-4 rounded-md">
            {conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-md">
                {index > 0 && (
                  <div className="flex items-center gap-2 -ml-2">
                    <Select
                      value={combinator}
                      onValueChange={(value: "AND" | "OR") => setCombinator(value)}
                    >
                      <SelectTrigger className="w-[80px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">Y</SelectItem>
                        <SelectItem value="OR">O</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Select 
                  value={condition.type} 
                  onValueChange={(value) => updateCondition(index, "type", value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">Mensaje</SelectItem>
                    <SelectItem value="tags">Etiquetas</SelectItem>
                    <SelectItem value="topics">Temas</SelectItem>
                    <SelectItem value="country">País</SelectItem>
                  </SelectContent>
                </Select>

                        <Select 
                  value={condition.operator} 
                  onValueChange={(value) => updateCondition(index, "operator", value)}
                >
                  <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                    <SelectItem value="contains">Contiene</SelectItem>
                    <SelectItem value="equals">Es igual a</SelectItem>
                    <SelectItem value="not_contains">No contiene</SelectItem>
                          </SelectContent>
                        </Select>

                {condition.type === "tags" && (
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                            {SAMPLE_TAGS.map((tag) => (
                              <Badge
                                key={tag}
                          variant={condition.value.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const tags = condition.value ? condition.value.split(", ") : []
                            const newTags = tags.includes(tag)
                              ? tags.filter(t => t !== tag)
                              : [...tags, tag]
                            updateCondition(index, "value", newTags.join(", "))
                          }}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                {condition.type === "topics" && (
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                            {SAMPLE_TOPICS.map((topic) => (
                              <Badge
                                key={topic}
                          variant={condition.value.includes(topic) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const topics = condition.value ? condition.value.split(", ") : []
                            const newTopics = topics.includes(topic)
                              ? topics.filter(t => t !== topic)
                              : [...topics, topic]
                            updateCondition(index, "value", newTopics.join(", "))
                          }}
                              >
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                {condition.type === "country" && (
                  <Select 
                    value={condition.value} 
                    onValueChange={(value) => updateCondition(index, "value", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona un país" />
                            </SelectTrigger>
                    <SelectContent>
                              {SAMPLE_COUNTRIES.map((country) => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                )}

                {condition.type === "message" && (
                  <Input
                    className="flex-1"
                    placeholder="Escribe el texto a buscar"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                  />
                )}

                {conditions.length > 1 && (
                        <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(index)}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                        </Button>
                )}
                    </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar condición
            </Button>
                  </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Asignar a</Label>
              <RadioGroup
                value={assignType}
                onValueChange={setAssignType}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team">Equipo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agent" id="agent" />
                  <Label htmlFor="agent">Agente específico</Label>
                </div>
              </RadioGroup>
            </div>

            {assignType === "team" && (
              <div className="space-y-2">
                <Label>Selecciona equipo</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAMPLE_TEAMS.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                    id="assignToSpecific"
                        checked={assignToSpecific}
                    onCheckedChange={(checked) => setAssignToSpecific(checked === true)}
                      />
                  <Label htmlFor="assignToSpecific">Asignar a un agente específico</Label>
                    </div>

                    {assignToSpecific && (
                  <div className="space-y-2">
                    <Label>Selecciona agente</Label>
                    <Select value={specificAgent} onValueChange={setSpecificAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.name}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                )}
              </div>
            )}

            {assignType === "agent" && (
              <div className="space-y-2">
                <Label>Selecciona agentes</Label>
                <div className="flex flex-wrap gap-2">
                  {filteredAgents.map((agent) => (
                    <Badge
                      key={agent.id}
                      variant={selectedAgents.includes(agent.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedAgents.includes(agent.name)) {
                          setSelectedAgents(selectedAgents.filter((name) => name !== agent.name))
                        } else {
                          setSelectedAgents([...selectedAgents, agent.name])
                        }
                      }}
                    >
                          {agent.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {editingCondition ? "Guardar cambios" : "Crear regla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AgentDistribution {
  agent: string;
  current: number;
  max: number;
}

// Definir las interfaces base
interface BaseCondition {
  id: string;
  name: string;
  enabled: boolean;
  fallback: string;
  useAIPersonalization?: boolean;
}

// Definir las interfaces específicas
interface OnlineCondition extends BaseCondition {
  id: "online";
  activeAgents: number;
  totalAgents: number;
}

interface BusinessHoursCondition extends BaseCondition {
  id: "businessHours";
  hours: {
    [key: string]: string;
  };
  timezone: string;
}

interface TicketLimitCondition extends BaseCondition {
  id: "ticketLimits";
  limit: number;
  min: number;
  max: number;
  randomAssign?: boolean;
  currentDistribution?: AgentDistribution[];
}
interface ConditionItemProps {
  condition: OnlineCondition | BusinessHoursCondition | TicketLimitCondition;
  index: number;
  conditions: GeneralConditionType[];
  setConditions: React.Dispatch<React.SetStateAction<GeneralConditionType[]>>;
  dragHandle?: any;
}

interface CheckboxChangeHandler {
  (checked: boolean | "indeterminate"): void;
}

// Actualizar el componente ConditionItem
const ConditionItem = ({ condition, index, conditions, setConditions, dragHandle }: ConditionItemProps) => {
  const toggleAIPersonalization = () => {
    const newConditions = [...conditions];
    newConditions[index] = {
      ...newConditions[index],
      useAIPersonalization: !newConditions[index].useAIPersonalization
    };
    setConditions(newConditions);
  };

  return (
    <div className="p-4 mb-4 bg-white rounded-md border flex flex-col gap-4 relative hover:border-purple-200 transition-colors">
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-medium text-sm">
        {index + 1}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 text-muted-foreground cursor-grab" {...dragHandle}>
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex items-center">
            <Checkbox
              id={`condition-${condition.id}`}
              checked={condition.enabled}
              onCheckedChange={(checked) => {
                const newConditions = [...conditions];
                newConditions[index].enabled = checked === true;
                setConditions(newConditions);
              }}
              className="mr-2 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
            <Label htmlFor={`condition-${condition.id}`} className="font-medium">
              {condition.name}
            </Label>
          </div>
        </div>
      </div>

      {condition.enabled && (
        <div className="space-y-3 w-full pl-10">
          {condition.id === "online" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Los tickets solo se asignarán a agentes que estén en línea y disponibles para atender consultas.
              </p>
              <div className="flex items-center space-x-2 bg-muted/20 p-3 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-sm font-medium">Agentes en línea: {condition.activeAgents}/{condition.totalAgents}</span>
            </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(condition.activeAgents / condition.totalAgents) * 100}%` }}
                    ></div>
          </div>
                </div>
              </div>
            </div>
          )}

          {condition.id === "businessHours" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(condition.hours || {}).map(([day, hours]) => (
                  <div key={day} className="space-y-2 bg-muted/10 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium capitalize">{day}</Label>
                      <Switch
                        checked={!!hours}
                        onCheckedChange={(checked) => {
                          const newConditions = [...conditions];
                          const currentCondition = newConditions[index] as BusinessHoursCondition;
                          if (!currentCondition.hours) {
                            currentCondition.hours = {};
                          }
                          currentCondition.hours[day] = checked ? "09:00-17:00" : "";
                          setConditions(newConditions);
                        }}
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                    {hours && (
                      <div className="flex gap-2">
                        <Select
                          value={hours.split("-")[0]}
                          onValueChange={(value) => {
                            const newConditions = [...conditions];
                            const currentCondition = newConditions[index] as BusinessHoursCondition;
                            const endTime = currentCondition.hours[day].split("-")[1];
                            currentCondition.hours[day] = `${value}-${endTime}`;
                            setConditions(newConditions);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Inicio" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => 
                              <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                                {`${i.toString().padStart(2, "0")}:00`}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Select
                          value={hours.split("-")[1]}
                          onValueChange={(value) => {
                            const newConditions = [...conditions];
                            const currentCondition = newConditions[index] as BusinessHoursCondition;
                            const startTime = currentCondition.hours[day].split("-")[0];
                            currentCondition.hours[day] = `${startTime}-${value}`;
                            setConditions(newConditions);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Fin" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => 
                              <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                                {`${i.toString().padStart(2, "0")}:00`}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                </div>
              ))}
              </div>
              <div className="flex items-center gap-2 bg-muted/20 p-3 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="text-sm">Zona horaria: {condition.timezone}</span>
              </div>
            </div>
          )}

          {condition.id === "ticketLimits" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Límite de tickets por agente</Label>
                  <div className="flex items-center gap-2">
              <Input
                type="number"
                      value={(condition as TicketLimitCondition).limit}
                onChange={(e) => {
                        const newConditions = [...conditions];
                        const value = Math.max(
                          (condition as TicketLimitCondition).min || 1,
                          Math.min((condition as TicketLimitCondition).max || 50, Number.parseInt(e.target.value))
                        );
                        newConditions[index] = {
                          ...newConditions[index],
                          limit: value
                        } as TicketLimitCondition;
                        setConditions(newConditions);
                      }}
                      min={(condition as TicketLimitCondition).min}
                      max={(condition as TicketLimitCondition).max}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">tickets</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-muted/20 p-3 rounded-md space-y-2">
                    <p className="text-sm font-medium">Distribución actual:</p>
                    <div className="space-y-2">
                      {(condition as TicketLimitCondition).currentDistribution?.map((agent: AgentDistribution) => (
                        <div key={agent.agent} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{agent.agent}</span>
                            <span className="font-medium">{agent.current}/{agent.max}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                agent.current / agent.max > 0.8 ? 'bg-red-500' :
                                agent.current / agent.max > 0.6 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${(agent.current / agent.max) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={`random-assign-${condition.id}`}
                  checked={(condition as TicketLimitCondition).randomAssign || false}
                  onCheckedChange={(checked) => {
                    const newConditions = [...conditions];
                    newConditions[index] = {
                      ...newConditions[index],
                      randomAssign: checked === true
                    } as TicketLimitCondition;
                    setConditions(newConditions);
                  }}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <div>
                  <Label htmlFor={`random-assign-${condition.id}`} className="font-medium">
                    Asignar aleatoriamente a otro agente si se alcanza el límite
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Se respetarán otras condiciones activas como horario de atención y agentes en línea
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">
                Mensaje que aparecerá si el routing falla por esta condición
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={condition.useAIPersonalization ? "default" : "outline"}
                      size="sm"
                      className={
                        condition.useAIPersonalization
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                      }
                      onClick={toggleAIPersonalization}
                    >
                      <Sparkles className={`h-4 w-4 mr-2 ${condition.useAIPersonalization ? "text-white" : "text-purple-600"}`} />
                      {condition.useAIPersonalization ? "IA Activada" : "Personalizar con IA"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Al activar la IA, el mensaje se personalizará automáticamente para cada cliente basándose en su contexto y la conversación</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
        </div>
            <div className="flex gap-2">
              <Input
                value={condition.fallback}
                onChange={(e) => {
                  const newConditions = [...conditions];
                  newConditions[index].fallback = e.target.value;
                  setConditions(newConditions);
                }}
                placeholder={condition.useAIPersonalization ? "La IA personalizará este mensaje para cada cliente" : "Mensaje de fallback"}
                className="w-full"
              />
            </div>
            {condition.useAIPersonalization && (
              <p className="text-sm text-purple-600 mt-2">
                <div className="flex items-center mb-2">
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span>La IA adaptará este mensaje base según:</span>
                </div>
                <ul className="list-disc pl-8 mt-1 space-y-1">
                  <li>El contexto de la conversación</li>
                  <li>El historial del cliente</li>
                  <li>El motivo específico de la asignación</li>
                  <li>El tono y sentimiento del cliente</li>
                </ul>
              </p>
      )}
    </div>
        </div>
      )}
    </div>
  );
};

interface AIRoutingSettings {
  csatWeight: number;
  responseTimeWeight: number;
  historyWeight: number;
  sentimentWeight: number;
  minCsat: number;
  maxResponseTime: number;
}

interface RoundRobinSettings {
  useTeams: boolean;
  selectedTeams: string[];
  useAgents: boolean;
  selectedAgents: string[];
  useAIPersonalization: boolean;
  successMessage: string;
}

interface SuccessMessageSectionProps {
  message: string;
  setMessage: (value: any) => void;
  useAIPersonalization: boolean;
  agentHandover?: boolean;
  handoverMessage?: string;
  routingType?: string;
}

interface SortableConditionItemProps {
  condition: GeneralConditionType;
  index: number;
  conditions: GeneralConditionType[];
  setConditions: React.Dispatch<React.SetStateAction<GeneralConditionType[]>>;
}

// Actualizar el componente SuccessMessageSection
const SuccessMessageSection = ({ 
  message, 
  setMessage, 
  useAIPersonalization, 
  agentHandover = false,
  handoverMessage = "",
  routingType = ""
}: SuccessMessageSectionProps) => {
  const [showHandoverMessage, setShowHandoverMessage] = useState(false);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage((prev: any) => ({
      ...prev,
      successMessage: e.target.value
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <Label className="font-medium text-base">Mensaje de asignación exitosa:</Label>
          <p className="text-sm text-muted-foreground">
            {agentHandover ? (
              <span className="flex items-center text-amber-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 9v4"></path>
                  <path d="M12 16h.01"></path>
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"></path>
                </svg>
                Se usará el mensaje de Agent Handover porque está activado en la configuración
                <Button
                  variant="link"
                  className="text-purple-600 px-2 h-auto"
                  onClick={() => setShowHandoverMessage(!showHandoverMessage)}
                >
                  {showHandoverMessage ? "Ocultar mensaje" : "Ver mensaje"}
                </Button>
              </span>
            ) : (
              `Este mensaje se mostrará cuando un ticket sea asignado correctamente ${
                routingType === "manual" ? "según las condiciones configuradas" :
                routingType === "roundRobin" ? "mediante round robin" :
                routingType === "ai" ? "por el sistema de IA" : ""
              }.`
            )}
          </p>
        </div>
        {!agentHandover && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={useAIPersonalization ? "default" : "outline"}
                  size="sm"
                  className={
                    useAIPersonalization
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                  }
                  onClick={() => setMessage((prev: any) => ({
                    ...prev,
                    useAIPersonalization: !prev.useAIPersonalization
                  }))}
                >
                  <Sparkles className={`h-4 w-4 mr-2 ${useAIPersonalization ? "text-white" : "text-purple-600"}`} />
                  {useAIPersonalization ? "IA Activada" : "Personalizar con IA"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Al activar la IA, el mensaje se personalizará automáticamente para cada cliente basándose en su contexto y la conversación</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {showHandoverMessage && agentHandover && (
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm font-medium mb-1">Mensaje de Agent Handover:</p>
          <p className="text-sm">{handoverMessage}</p>
        </div>
      )}
      
      <Textarea 
        value={message}
        onChange={handleMessageChange}
        className="min-h-[100px]"
        placeholder={useAIPersonalization ? "La IA personalizará este mensaje para cada cliente" : "Mensaje de asignación exitosa"}
        disabled={agentHandover}
      />
      {useAIPersonalization && !agentHandover && (
        <div className="text-sm text-purple-600 mt-2">
          <div className="flex items-center mb-2">
            <Sparkles className="h-4 w-4 mr-2" />
            <span>La IA adaptará este mensaje base según:</span>
          </div>
          <ul className="list-disc pl-8 mt-1 space-y-1">
            <li>El contexto de la conversación</li>
            <li>El historial del cliente</li>
            <li>El motivo específico de la asignación</li>
            <li>El tono y sentimiento del cliente</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Actualizar el componente SortableConditionItem
const SortableConditionItem = ({ condition, index, conditions, setConditions }: SortableConditionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: condition.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ConditionItem
        condition={condition}
        index={index}
        conditions={conditions}
        setConditions={setConditions}
        dragHandle={listeners}
      />
    </div>
  );
};

export default function InboxSettings() {
  // Estados para Agent Handover y Routing Type
  const [agentHandover, setAgentHandover] = useState(true)
  const [handoverMessage, setHandoverMessage] = useState(
    "Sure, I will connect you to a representative. It won't take long.",
  )
  const [explicitRequest, setExplicitRequest] = useState(true)
  const [cannotAnswer, setCannotAnswer] = useState(true)
  const [negativeSentiment, setNegativeSentiment] = useState(false)
  const [keywordsEnabled, setKeywordsEnabled] = useState(true)
  const [keywords, setKeywords] = useState("Return product")

  // Estado para Routing Type
  const [routingEnabled, setRoutingEnabled] = useState(false)
  const [routingType, setRoutingType] = useState("none")

  // Estado para condiciones de routing manual
  const [routingConditions, setRoutingConditions] = useState<RoutingCondition[]>([
    {
      id: 1,
      name: "Devolución, Reembolso",
      conditionType: "tags",
      conditionValue: "Devolución, Reembolso",
      subconditions: null,
      operator: null,
      assignType: "team",
      assignValue: "Devoluciones",
      specificAgent: null,
    },
    {
      id: 2,
      name: "México",
      conditionType: "country",
      conditionValue: "México",
      subconditions: null,
      operator: null,
      assignType: "agent",
      assignValue: "María Rodríguez, Juan Martínez",
      specificAgent: null,
    },
    {
      id: 3,
      name: "Soporte, Técnico",
      conditionType: "compound",
      conditionValue: "",
      subconditions: [
        { conditionType: "tags", conditionValue: "Soporte, Técnico" },
        { conditionType: "country", conditionValue: "España" }
      ],
      operator: "AND",
      assignType: "team",
      assignValue: "Soporte Técnico",
      specificAgent: "Carlos López"
    }
  ])
  const [isConditionFormOpen, setIsConditionFormOpen] = useState(false)
  const [editingCondition, setEditingCondition] = useState<RoutingCondition | null>(null)

  // Agregar un nuevo estado para el mensaje de routing exitoso
  const [successRoutingMessage, setSuccessRoutingMessage] = useState(
    "Tu mensaje ha sido recibido. Un agente te atenderá pronto.",
  )

  // Estado para AI Routing Options
  const [csatEnabled, setCsatEnabled] = useState(false)
  const [responseTimeEnabled, setResponseTimeEnabled] = useState(false)
  const [historyEnabled, setHistoryEnabled] = useState(false)
  const [sentimentEnabled, setSentimentEnabled] = useState(false)

  // Estado para Condiciones Generales
  const [conditionsEnabled, setConditionsEnabled] = useState(false)
  const [conditions, setConditions] = useState<GeneralConditionType[]>([
    {
      id: "online",
      name: "Agentes en línea",
      enabled: false,
      fallback: "Lo siento, todos nuestros agentes están ocupados en este momento. Tu consulta será atendida tan pronto como un agente esté disponible.",
      activeAgents: 5,
      totalAgents: 8
    } as OnlineCondition,
    {
      id: "businessHours",
      name: "Horario de atención",
      enabled: false,
      fallback: "Nuestro horario de atención ha finalizado. Te atenderemos en cuanto iniciemos operaciones.",
      hours: {
        lunes: "09:00-17:00",
        martes: "09:00-17:00",
        miercoles: "09:00-17:00",
        jueves: "09:00-17:00",
        viernes: "09:00-17:00",
        sabado: "",
        domingo: "",
      },
      timezone: "America/Mexico_City"
    },
    {
      id: "ticketLimits",
      name: "Límites de tickets",
      enabled: false,
      fallback: "Nuestros agentes están manejando el máximo de tickets permitido. Tu consulta será atendida pronto.",
      limit: 10,
      min: 1,
      max: 50,
      randomAssign: true,
      currentDistribution: [
        { agent: "Ana García", current: 8, max: 10 },
        { agent: "Carlos López", current: 5, max: 10 },
        { agent: "María Rodríguez", current: 7, max: 10 }
      ]
    },
  ])

  // Estado extendido para routing con IA
  const [aiSettings, setAiSettings] = useState<AIRoutingSettings>({
    csatWeight: 25,
    responseTimeWeight: 25,
    historyWeight: 25,
    sentimentWeight: 25,
    minCsat: 4.0,
    maxResponseTime: 15
  })

  // Estado para Round Robin
  const [roundRobinSettings, setRoundRobinSettings] = useState<RoundRobinSettings>({
    useTeams: true,
    selectedTeams: [],
    useAgents: false,
    selectedAgents: [],
    useAIPersonalization: false,
    successMessage: "Tu consulta ha sido asignada. Un agente te atenderá en breve."
  });

  // Estados para mensajes de éxito
  const [manualRoutingSettings, setManualRoutingSettings] = useState({
    useAIPersonalization: false,
    successMessage: "Tu consulta ha sido asignada según nuestros criterios. Un agente te atenderá en breve."
  });

  const [aiRoutingSettings, setAiRoutingSettings] = useState({
    useAIPersonalization: false,
    successMessage: "¡Buenas noticias! Hemos encontrado el agente ideal para ayudarte. Te atenderá en breve."
  });

  // Agregar estado para IA en Agent Handover
  const [handoverAISettings, setHandoverAISettings] = useState({
    useAIPersonalization: false,
    handoverMessage: "Sure, I will connect you to a representative. It won't take long."
  });

  // Personalizar mensaje con IA
  const personalizeHandoverMessage = () => {
    setHandoverMessage(
      "Hi [User Name], I'll connect you with a representative who specializes in [Topic]. It won't take long.",
    )
  }

  // Funciones para manejar condiciones de routing
  const handleAddCondition = () => {
    setEditingCondition(null)
    setIsConditionFormOpen(true)
  }

  const handleEditCondition = (condition: RoutingCondition) => {
    setEditingCondition(condition)
    setIsConditionFormOpen(true)
  }

  const handleDeleteCondition = (id: number) => {
    setRoutingConditions(routingConditions.filter((c) => c.id !== id))
  }

  const handleSaveCondition = (condition: RoutingCondition) => {
    // Validar que no haya condiciones duplicadas
    const isDuplicate = routingConditions.some(
      (c) => 
        c.id !== condition.id && 
        c.conditionType === condition.conditionType && 
        c.conditionValue === condition.conditionValue
    )

    if (isDuplicate) {
      alert("Ya existe una condición con los mismos criterios")
      return
    }

    if (editingCondition) {
      setRoutingConditions(routingConditions.map((c) => (c.id === condition.id ? condition : c)))
    } else {
      setRoutingConditions([...routingConditions, condition])
    }
  }

  const handleCheckboxChange = (setter: React.Dispatch<React.SetStateAction<boolean>>): CheckboxChangeHandler => {
    return (checked) => setter(checked === true)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setConditions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Agregar estados para controlar la expansión de secciones
  const [expandedSections, setExpandedSections] = useState({
    agentHandover: true,
    routingType: true,
    generalConditions: true
  });

  // Agregar estados para controlar cambios pendientes
  const [pendingChanges, setPendingChanges] = useState({
    agentHandover: false,
    routingType: false,
    generalConditions: false
  });

  // Función para manejar cambios en las secciones
  const handleSectionChange = (section: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [section]: true
    }));
  };

  // Función para guardar cambios de una sección
  const handleSaveChanges = (section: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [section]: false
    }));
    // Aquí iría la lógica para guardar los cambios en el backend
    console.log(`Guardando cambios de ${section}`);
  };

  // Función para alternar la expansión de una sección
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      if (section === 'agentHandover' || section === 'routingType' || section === 'generalConditions') {
        return {
          ...prev,
          [section]: !prev[section]
        };
      }
      return prev;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {/* Sección 1: Agent Handover */}
      <Card className="border-t-0 border-x-0 rounded-none shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection('agentHandover')}
                className="h-8 w-8"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transform transition-transform ${expandedSections.agentHandover ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </Button>
            <div>
              <h2 className="text-xl font-semibold">Transferencia de Sofia AI a Agente</h2>
              <p className="text-muted-foreground mt-1">
                Elige cuándo Sofia AI debería transferir la conversación a un humano real.
              </p>
            </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingChanges.agentHandover && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveChanges('agentHandover')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Guardar cambios
                </Button>
              )}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Activado</span>
              <Switch
                id="agent-handover"
                checked={agentHandover}
                  onCheckedChange={(checked) => {
                    setAgentHandover(checked);
                    handleSectionChange('agentHandover');
                  }}
                className="data-[state=checked]:bg-purple-600"
              />
              </div>
            </div>
          </div>

          {expandedSections.agentHandover && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="explicit-request"
                    className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    checked={explicitRequest}
                    onCheckedChange={handleCheckboxChange(setExplicitRequest)}
                  />
                  <div>
                    <Label htmlFor="explicit-request" className="font-medium">
                      Cuando el cliente explícitamente pide hablar con un agente
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="cannot-answer"
                    className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    checked={cannotAnswer}
                    onCheckedChange={handleCheckboxChange(setCannotAnswer)}
                  />
                  <div>
                    <Label htmlFor="cannot-answer" className="font-medium">
                      Cuando Sofia AI no puede responder una pregunta.
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="negative-sentiment"
                    className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    checked={negativeSentiment}
                    onCheckedChange={handleCheckboxChange(setNegativeSentiment)}
                  />
                  <div>
                    <Label htmlFor="negative-sentiment" className="font-medium">
                      Cuando el sentimiento del cliente es 😞 Negativo
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="keywords"
                    className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    checked={keywordsEnabled}
                    onCheckedChange={handleCheckboxChange(setKeywordsEnabled)}
                  />
                  <div className="w-full">
                    <Label htmlFor="keywords" className="font-medium">
                      Cuando el cliente menciona ciertas palabras clave o temas
                    </Label>
                    <div className="mt-2">
                      <Textarea
                        placeholder="Ingresa palabras clave o temas"
                        className="min-h-[100px]"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        disabled={!keywordsEnabled}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Separa tus palabras clave y temas con comas ","
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-base">Mensaje de entrega personalizado:</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={handoverAISettings.useAIPersonalization ? "default" : "outline"}
                          size="sm"
                          className={
                            handoverAISettings.useAIPersonalization
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                          }
                          onClick={() => setHandoverAISettings({
                            ...handoverAISettings,
                            useAIPersonalization: !handoverAISettings.useAIPersonalization
                          })}
                        >
                          <Sparkles className={`h-4 w-4 mr-2 ${handoverAISettings.useAIPersonalization ? "text-white" : "text-purple-600"}`} />
                          {handoverAISettings.useAIPersonalization ? "IA Activada" : "Personalizar con IA"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Al activar la IA, el mensaje se personalizará automáticamente para cada cliente basándose en su contexto y la conversación</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-muted-foreground text-sm">
                  Sofia transferirá la conversación a un agente cuando tus clientes deseen interactuar con un humano real.
                </p>
                <Textarea
                  value={handoverAISettings.handoverMessage}
                  onChange={(e) => setHandoverAISettings({
                    ...handoverAISettings,
                    handoverMessage: e.target.value
                  })}
                  className="min-h-[100px] mt-2"
                  placeholder={handoverAISettings.useAIPersonalization ? "La IA personalizará este mensaje para cada cliente" : "Mensaje de handover"}
                />
                {handoverAISettings.useAIPersonalization && (
                  <p className="text-sm text-purple-600 mt-2">
                    <div className="flex items-center mb-2">
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span>La IA adaptará este mensaje base según:</span>
                    </div>
                    <ul className="list-disc pl-8 mt-1 space-y-1">
                      <li>El contexto de la conversación</li>
                      <li>El historial del cliente</li>
                      <li>El motivo específico de la transferencia</li>
                      <li>El tono y sentimiento del cliente</li>
                    </ul>
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección 2: Routing Type */}
      <Card className="border-t-0 border-x-0 rounded-none shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection('routingType')}
                className="h-8 w-8"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transform transition-transform ${expandedSections.routingType ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </Button>
            <div>
              <h2 className="text-xl font-semibold">Tipo de Routing</h2>
                <p className="text-muted-foreground mt-1">
                  Configura cómo se asignarán los tickets a los agentes.
                </p>
            </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingChanges.routingType && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveChanges('routingType')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Guardar cambios
                </Button>
              )}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Activado</span>
              <Switch
                id="routing-enabled"
                checked={routingEnabled}
                  onCheckedChange={(checked) => {
                    setRoutingEnabled(checked);
                    handleSectionChange('routingType');
                  }}
                className="data-[state=checked]:bg-purple-600"
              />
              </div>
            </div>
          </div>

          {expandedSections.routingType && (
            <div className="mt-6 space-y-6">
              <div>
                <Label htmlFor="routing-type" className="font-medium">
                  Selecciona el tipo de routing:
                </Label>
                <Select value={routingType} onValueChange={setRoutingType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar tipo</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="roundRobin">Round Robin</SelectItem>
                    <SelectItem value="ai">Con IA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {routingType === "manual" && (
                <div className="space-y-6 pl-4 border-l-2 border-purple-100">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-medium">Condiciones de asignación</h3>
                    <Button onClick={handleAddCondition} className="bg-purple-600 hover:bg-purple-700" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear nueva condición
                    </Button>
                  </div>

                  {routingConditions.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="conditions">
                        <AccordionTrigger className="py-2">
                          <span className="text-sm font-medium">
                            {routingConditions.length} {routingConditions.length === 1 ? "condición" : "condiciones"}{" "}
                            configuradas
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 pt-2">
                            {routingConditions.map((condition) => (
                              <RoutingConditionItem
                                key={condition.id}
                                condition={condition}
                                onEdit={handleEditCondition}
                                onDelete={handleDeleteCondition}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <div className="text-center py-6 bg-muted/20 rounded-md">
                      <p className="text-muted-foreground">No hay condiciones configuradas</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Crea una nueva condición para definir cómo asignar tickets
                      </p>
                    </div>
                  )}

                  <SuccessMessageSection
                    message={manualRoutingSettings.successMessage}
                    setMessage={setManualRoutingSettings}
                    useAIPersonalization={manualRoutingSettings.useAIPersonalization}
                    agentHandover={agentHandover}
                    handoverMessage={handoverMessage}
                    routingType={routingType}
                  />
                </div>
              )}

              {routingType === "roundRobin" && (
                <div className="space-y-6 pl-4 border-l-2 border-purple-100">
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="text-purple-600 mr-3 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24"></path>
                          <path d="M21 3v9h-9"></path>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-purple-800">Round Robin</p>
                        <p className="text-purple-700 text-sm">
                          Asignación equitativa y rotativa entre los agentes o equipos seleccionados.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useTeams"
                          checked={roundRobinSettings.useTeams}
                          onCheckedChange={(checked) => {
                            setRoundRobinSettings({
                              ...roundRobinSettings,
                              useTeams: checked === true,
                              useAgents: checked === false ? true : roundRobinSettings.useAgents
                            });
                          }}
                          className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <Label htmlFor="useTeams">Incluir equipos</Label>
                      </div>

                      {roundRobinSettings.useTeams && (
                        <div className="pl-6 space-y-2">
                          <Label className="text-sm">Selecciona los equipos</Label>
                          <div className="flex flex-wrap gap-2">
                            {SAMPLE_TEAMS.map((team) => (
                              <Badge
                                key={team}
                                variant={roundRobinSettings.selectedTeams.includes(team) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const newTeams = roundRobinSettings.selectedTeams.includes(team)
                                    ? roundRobinSettings.selectedTeams.filter(t => t !== team)
                                    : [...roundRobinSettings.selectedTeams, team];
                                  setRoundRobinSettings({...roundRobinSettings, selectedTeams: newTeams});
                                }}
                              >
                                {team}
                              </Badge>
                            ))}
                          </div>
                </div>
              )}
                    </div>

                  <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useAgents"
                          checked={roundRobinSettings.useAgents}
                          onCheckedChange={(checked) => {
                            setRoundRobinSettings({
                              ...roundRobinSettings,
                              useAgents: checked === true,
                              useTeams: checked === false ? true : roundRobinSettings.useTeams
                            });
                          }}
                          className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <Label htmlFor="useAgents">Incluir agentes específicos</Label>
                      </div>

                      {roundRobinSettings.useAgents && (
                        <div className="pl-6 space-y-2">
                          <Label className="text-sm">Selecciona los agentes</Label>
                          <div className="flex flex-wrap gap-2">
                            {SAMPLE_AGENTS.map((agent) => (
                              <Badge
                                key={agent.id}
                                variant={roundRobinSettings.selectedAgents.includes(agent.name) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const newAgents = roundRobinSettings.selectedAgents.includes(agent.name)
                                    ? roundRobinSettings.selectedAgents.filter(a => a !== agent.name)
                                    : [...roundRobinSettings.selectedAgents, agent.name];
                                  setRoundRobinSettings({...roundRobinSettings, selectedAgents: newAgents});
                                }}
                              >
                                {agent.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <SuccessMessageSection
                      message={roundRobinSettings.successMessage}
                      setMessage={setRoundRobinSettings}
                      useAIPersonalization={roundRobinSettings.useAIPersonalization}
                      agentHandover={agentHandover}
                      handoverMessage={handoverMessage}
                      routingType={routingType}
                    />
                  </div>
                </div>
              )}

              {routingType === "ai" && (
                <div className="space-y-6 pl-4 border-l-2 border-purple-100">
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="text-purple-600 mr-3 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-purple-800">Routing Inteligente</p>
                        <p className="text-purple-700 text-sm">
                          El sistema utilizará IA para asignar tickets basándose en múltiples factores y sus pesos relativos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-medium mb-4">Factores de asignación y sus pesos</h3>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="csat"
                        checked={csatEnabled}
                                  onCheckedChange={handleCheckboxChange(setCsatEnabled)}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <Label htmlFor="csat">CSAT de agentes</Label>
                    </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Prioriza agentes con mejor calificación de satisfacción
                              </p>
                            </div>
                            {csatEnabled && (
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Peso:</Label>
                                <Select
                                  value={aiSettings.csatWeight.toString()}
                                  onValueChange={(value) => setAiSettings({...aiSettings, csatWeight: parseInt(value)})}
                                >
                                  <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 25, 50, 75, 100].map((weight) => (
                                      <SelectItem key={weight} value={weight.toString()}>
                                        {weight}%
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {csatEnabled && (
                            <div className="pl-6 space-y-2">
                              <Label className="text-sm">CSAT mínimo requerido</Label>
                              <Select
                                value={aiSettings.minCsat.toString()}
                                onValueChange={(value) => setAiSettings({...aiSettings, minCsat: parseFloat(value)})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[3.0, 3.5, 4.0, 4.5].map((csat) => (
                                    <SelectItem key={csat} value={csat.toString()}>
                                      {csat} estrellas
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="responseTime"
                        checked={responseTimeEnabled}
                                  onCheckedChange={handleCheckboxChange(setResponseTimeEnabled)}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                                <Label htmlFor="responseTime">Tiempo de respuesta</Label>
                    </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Prioriza agentes con mejor tiempo de respuesta promedio
                              </p>
                            </div>
                            {responseTimeEnabled && (
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Peso:</Label>
                                <Select
                                  value={aiSettings.responseTimeWeight.toString()}
                                  onValueChange={(value) => setAiSettings({...aiSettings, responseTimeWeight: parseInt(value)})}
                                >
                                  <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 25, 50, 75, 100].map((weight) => (
                                      <SelectItem key={weight} value={weight.toString()}>
                                        {weight}%
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {responseTimeEnabled && (
                            <div className="pl-6 space-y-2">
                              <Label className="text-sm">Tiempo máximo de respuesta</Label>
                              <Select
                                value={aiSettings.maxResponseTime.toString()}
                                onValueChange={(value) => setAiSettings({...aiSettings, maxResponseTime: parseInt(value)})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 10, 15, 20, 30].map((time) => (
                                    <SelectItem key={time} value={time.toString()}>
                                      {time} minutos
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="history"
                        checked={historyEnabled}
                                  onCheckedChange={handleCheckboxChange(setHistoryEnabled)}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <Label htmlFor="history">Historial de conversaciones</Label>
                    </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Prioriza agentes que han interactuado previamente con el cliente
                              </p>
                            </div>
                            {historyEnabled && (
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Peso:</Label>
                                <Select
                                  value={aiSettings.historyWeight.toString()}
                                  onValueChange={(value) => setAiSettings({...aiSettings, historyWeight: parseInt(value)})}
                                >
                                  <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 25, 50, 75, 100].map((weight) => (
                                      <SelectItem key={weight} value={weight.toString()}>
                                        {weight}%
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sentiment"
                        checked={sentimentEnabled}
                                  onCheckedChange={handleCheckboxChange(setSentimentEnabled)}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                                <Label htmlFor="sentiment">Sentimiento del cliente</Label>
                    </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                Prioriza agentes con mejor manejo de situaciones similares
                              </p>
                  </div>
                            {sentimentEnabled && (
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Peso:</Label>
                                <Select
                                  value={aiSettings.sentimentWeight.toString()}
                                  onValueChange={(value) => setAiSettings({...aiSettings, sentimentWeight: parseInt(value)})}
                                >
                                  <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[0, 25, 50, 75, 100].map((weight) => (
                                      <SelectItem key={weight} value={weight.toString()}>
                                        {weight}%
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                </div>
              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="text-base font-medium">Configuración adicional</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                          <div className="flex items-start">
                            <div className="text-amber-600 mr-3 mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 9v4"></path>
                                <path d="M12 16h.01"></path>
                                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"></path>
                              </svg>
                            </div>
                  <div>
                              <p className="font-medium text-amber-800">Importante:</p>
                              <p className="text-amber-700 text-sm">
                                La IA aprenderá y mejorará sus asignaciones basándose en el rendimiento histórico y los resultados de las interacciones. Asegúrate de mantener actualizados los perfiles de los agentes para obtener mejores resultados.
                    </p>
                  </div>
                          </div>
                        </div>
                      </div>
                  </div>
                  
                    <SuccessMessageSection
                      message={aiRoutingSettings.successMessage}
                      setMessage={setAiRoutingSettings}
                      useAIPersonalization={aiRoutingSettings.useAIPersonalization}
                      agentHandover={agentHandover}
                      handoverMessage={handoverMessage}
                      routingType={routingType}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección 3: Condiciones Generales */}
      <Card className="border-t-0 border-x-0 rounded-none shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection('generalConditions')}
                className="h-8 w-8"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transform transition-transform ${expandedSections.generalConditions ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </Button>
            <div>
              <h2 className="text-xl font-semibold">Condiciones Generales</h2>
              <p className="text-muted-foreground mt-1">
                Configura condiciones adicionales para el routing de tickets.
              </p>
            </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingChanges.generalConditions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveChanges('generalConditions')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Guardar cambios
                </Button>
              )}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Activado</span>
              <Switch
                id="conditions-enabled"
                checked={conditionsEnabled}
                  onCheckedChange={(checked) => {
                    setConditionsEnabled(checked);
                    handleSectionChange('generalConditions');
                  }}
                className="data-[state=checked]:bg-purple-600"
              />
              </div>
            </div>
          </div>

          {expandedSections.generalConditions && (
            <div className="mt-6">
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4 mb-6">
                <div className="flex items-start">
                  <div className="text-purple-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-purple-800">Orden de ejecución:</p>
                    <p className="text-purple-700 text-sm">
                      El sistema evaluará las condiciones activadas en el orden que aparecen aquí. 
                      Puedes reorganizarlas arrastrando el ícono <GripVertical className="h-4 w-4 inline-block mx-1" /> 
                      para cambiar su prioridad.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-purple-200"></div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={conditions.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                {conditions.map((condition, index) => (
                      <SortableConditionItem
                    key={condition.id}
                    condition={condition}
                    index={index}
                    conditions={conditions}
                    setConditions={setConditions}
                  />
                ))}
                  </SortableContext>
                </DndContext>
              </div>

              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="text-amber-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span className="text-sm">Zona horaria actual: America/Mexico_City</span>
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">Importante:</p>
                    <p className="text-amber-700 text-sm">
                      El sistema evaluará cada condición activada en orden. Si una condición falla, el ticket entrará a una cola y los agentes deberán asignarlo manualmente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de condición de routing */}
      <RoutingConditionForm
        isOpen={isConditionFormOpen}
        onClose={() => setIsConditionFormOpen(false)}
        onSave={handleSaveCondition}
        editingCondition={editingCondition}
      />
    </div>
  )
}

