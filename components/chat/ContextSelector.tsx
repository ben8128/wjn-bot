"use client";

import { CampaignContext } from "@/lib/prompts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ContextSelectorProps {
  context: CampaignContext;
  onChange: (context: CampaignContext) => void;
  isCollapsed?: boolean;
}

export function ContextSelector({
  context,
  onChange,
  isCollapsed,
}: ContextSelectorProps) {
  if (isCollapsed) {
    const hasContext = context.officeType || context.geography || context.audience || context.medium;
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {context.officeType && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {context.officeType === "federal" ? "Fed" : context.officeType === "state" ? "State" : "Local"}
          </Badge>
        )}
        {context.geography && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 max-w-[80px] truncate">
            {context.geography}
          </Badge>
        )}
        {context.audience && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 max-w-[80px] truncate">
            {context.audience}
          </Badge>
        )}
        {context.medium && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {context.medium}
          </Badge>
        )}
        {!hasContext && (
          <span className="text-[10px] text-muted-foreground">General</span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-2 bg-muted/50 rounded-md">
      <div className="space-y-1">
        <Label htmlFor="officeType" className="text-[10px] font-medium text-muted-foreground">
          Office
        </Label>
        <Select
          value={context.officeType || ""}
          onValueChange={(value) =>
            onChange({
              ...context,
              officeType: value as CampaignContext["officeType"],
            })
          }
        >
          <SelectTrigger id="officeType" className="h-7 text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="federal">Federal</SelectItem>
            <SelectItem value="state">State</SelectItem>
            <SelectItem value="local">Local</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="geography" className="text-[10px] font-medium text-muted-foreground">
          Geography
        </Label>
        <Input
          id="geography"
          placeholder="e.g., Michigan..."
          value={context.geography || ""}
          onChange={(e) =>
            onChange({ ...context, geography: e.target.value || undefined })
          }
          className="h-7 text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audience" className="text-[10px] font-medium text-muted-foreground">
          Audience
        </Label>
        <Input
          id="audience"
          placeholder="e.g., Union members..."
          value={context.audience || ""}
          onChange={(e) =>
            onChange({ ...context, audience: e.target.value || undefined })
          }
          className="h-7 text-xs"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="medium" className="text-[10px] font-medium text-muted-foreground">
          Medium
        </Label>
        <Select
          value={context.medium || ""}
          onValueChange={(value) =>
            onChange({
              ...context,
              medium: value as CampaignContext["medium"],
            })
          }
        >
          <SelectTrigger id="medium" className="h-7 text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="speech">Speech</SelectItem>
            <SelectItem value="ad">TV/Radio</SelectItem>
            <SelectItem value="mailer">Mail</SelectItem>
            <SelectItem value="digital">Digital</SelectItem>
            <SelectItem value="canvass">Canvass</SelectItem>
            <SelectItem value="debate">Debate</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
