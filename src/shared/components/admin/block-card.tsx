'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus, GripVertical, FileText, HelpCircle, CheckSquare, Columns } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { ContentSection } from '@/shared/schemas/api-schemas';

interface BlockCardProps {
  block: ContentSection;
  index: number;
  totalBlocks: number;
  onUpdate: (updates: Partial<ContentSection>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const BLOCK_ICONS: Record<string, typeof FileText> = {
  'rich-text': FileText,
  'faq-accordion': HelpCircle,
  'checklist': CheckSquare,
  'comparison-table': Columns,
};

const BLOCK_LABELS: Record<string, string> = {
  'rich-text': '文本段落',
  'faq-accordion': '常见问题',
  'checklist': '列表清单',
  'comparison-table': '对比表格',
};

/**
 * BlockCard - A single editable content section block
 * Part of the Admin SEO Editor Block-based system
 */
export function BlockCard({ 
  block, 
  index, 
  totalBlocks, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown 
}: BlockCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = BLOCK_ICONS[block.type] || FileText;

  return (
    <Card className="border-border-medium bg-card/50">
      {/* Header: Drag Handle + Title + Actions */}
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          {/* Drag Handle (visual only for now) */}
          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
          
          {/* Type Icon & Badge */}
          <Icon className="h-4 w-4 text-primary" />
          <Badge variant="outline" className="text-xs font-normal">
            {BLOCK_LABELS[block.type] || block.type}
          </Badge>
          
          {/* Editable Title */}
          <Input
            value={block.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="flex-1 h-8 text-sm font-medium bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            placeholder="Section Title (H2)"
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveUp}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveDown}
              disabled={index === totalBlocks - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Content: Type-specific editor */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4">
          {block.type === 'rich-text' && (
            <RichTextEditor 
              data={block.data as { text: string }}
              onUpdate={(data) => onUpdate({ data })}
            />
          )}
          {block.type === 'faq-accordion' && (
            <FAQEditor 
              data={block.data as { items: Array<{ q: string; a: string }> }}
              onUpdate={(data) => onUpdate({ data })}
            />
          )}
          {block.type === 'checklist' && (
            <ChecklistEditor 
              data={block.data as { items: string[] }}
              onUpdate={(data) => onUpdate({ data })}
            />
          )}
          {block.type === 'comparison-table' && (
            <ComparisonEditor 
              data={block.data as { left: string; right: string; rows: Array<{ pro: string; con: string }> }}
              onUpdate={(data) => onUpdate({ data })}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * RichTextEditor - Simple textarea for paragraph content
 */
function RichTextEditor({ 
  data, 
  onUpdate 
}: { 
  data: { text: string }; 
  onUpdate: (data: { text: string }) => void;
}) {
  return (
    <Textarea
      value={data.text || ''}
      onChange={(e) => onUpdate({ text: e.target.value })}
      rows={4}
      className="text-sm resize-none"
      placeholder="Enter paragraph content..."
    />
  );
}

/**
 * FAQEditor - Q&A pair list editor
 */
function FAQEditor({ 
  data, 
  onUpdate 
}: { 
  data: { items: Array<{ q: string; a: string }> }; 
  onUpdate: (data: { items: Array<{ q: string; a: string }> }) => void;
}) {
  const items = data.items || [];

  const handleItemChange = (index: number, field: 'q' | 'a', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ items: newItems });
  };

  const handleAddItem = () => {
    onUpdate({ items: [...items, { q: '', a: '' }] });
  };

  const handleRemoveItem = (index: number) => {
    onUpdate({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="relative p-3 rounded-lg bg-muted/30 border border-border-subtle space-y-2">
          <div className="flex items-start gap-2">
            <Label className="text-xs text-muted-foreground shrink-0 w-6 pt-2">Q:</Label>
            <Input
              value={item.q}
              onChange={(e) => handleItemChange(index, 'q', e.target.value)}
              placeholder="Question..."
              className="text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
              onClick={() => handleRemoveItem(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-start gap-2">
            <Label className="text-xs text-muted-foreground shrink-0 w-6 pt-2">A:</Label>
            <Textarea
              value={item.a}
              onChange={(e) => handleItemChange(index, 'a', e.target.value)}
              placeholder="Answer..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddItem}
        className="w-full gap-2"
      >
        <Plus className="h-3 w-3" />
        Add Question
      </Button>
    </div>
  );
}

/**
 * ChecklistEditor - Simple list item editor
 */
function ChecklistEditor({ 
  data, 
  onUpdate 
}: { 
  data: { items: string[] }; 
  onUpdate: (data: { items: string[] }) => void;
}) {
  const items = data.items || [];

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onUpdate({ items: newItems });
  };

  const handleAddItem = () => {
    onUpdate({ items: [...items, ''] });
  };

  const handleRemoveItem = (index: number) => {
    onUpdate({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
          <Input
            value={item}
            onChange={(e) => handleItemChange(index, e.target.value)}
            placeholder="List item..."
            className="text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
            onClick={() => handleRemoveItem(index)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddItem}
        className="w-full gap-2"
      >
        <Plus className="h-3 w-3" />
        Add Item
      </Button>
    </div>
  );
}

/**
 * ComparisonEditor - Two-column comparison table editor
 */
function ComparisonEditor({ 
  data, 
  onUpdate 
}: { 
  data: { left: string; right: string; rows: Array<{ pro: string; con: string }> }; 
  onUpdate: (data: { left: string; right: string; rows: Array<{ pro: string; con: string }> }) => void;
}) {
  const rows = data.rows || [];

  const handleHeaderChange = (field: 'left' | 'right', value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleRowChange = (index: number, field: 'pro' | 'con', value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    onUpdate({ ...data, rows: newRows });
  };

  const handleAddRow = () => {
    onUpdate({ ...data, rows: [...rows, { pro: '', con: '' }] });
  };

  const handleRemoveRow = (index: number) => {
    onUpdate({ ...data, rows: rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {/* Headers */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={data.left || ''}
          onChange={(e) => handleHeaderChange('left', e.target.value)}
          placeholder="Left Column Header"
          className="text-sm font-medium"
        />
        <Input
          value={data.right || ''}
          onChange={(e) => handleHeaderChange('right', e.target.value)}
          placeholder="Right Column Header"
          className="text-sm font-medium"
        />
      </div>
      
      {/* Rows */}
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-2 flex-1">
            <Input
              value={row.pro}
              onChange={(e) => handleRowChange(index, 'pro', e.target.value)}
              placeholder="Left value..."
              className="text-sm"
            />
            <Input
              value={row.con}
              onChange={(e) => handleRowChange(index, 'con', e.target.value)}
              placeholder="Right value..."
              className="text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
            onClick={() => handleRemoveRow(index)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="w-full gap-2"
      >
        <Plus className="h-3 w-3" />
        Add Row
      </Button>
    </div>
  );
}
