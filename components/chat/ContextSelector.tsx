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
    return (
      <div className="flex flex-wrap gap-2">
        {context.officeType && (
          <Badge variant="secondary" className="text-xs">
            {context.officeType === "federal"
              ? "Federal"
              : context.officeType === "state"
              ? "State"
              : "Local"}
          </Badge>
        )}
        {context.geography && (
          <Badge variant="secondary" className="text-xs">
            {context.geography}
          </Badge>
        )}
        {context.audience && (
          <Badge variant="secondary" className="text-xs">
            {context.audience}
          </Badge>
        )}
        {context.medium && (
          <Badge variant="secondary" className="text-xs">
            {context.medium}
          </Badge>
        )}
        {!context.officeType &&
          !context.geography &&
          !context.audience &&
          !context.medium && (
            <span className="text-xs text-muted-foreground">
              No context set - general guidance
            </span>
          )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="officeType" className="text-xs font-medium">
          Office Type
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
          <SelectTrigger id="officeType" className="h-9">
            <SelectValue placeholder="Select office..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="federal">Federal (House/Senate)</SelectItem>
            <SelectItem value="state">State Legislature</SelectItem>
            <SelectItem value="local">Local/Municipal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="geography" className="text-xs font-medium">
          Geography
        </Label>
        <Input
          id="geography"
          placeholder="e.g., Michigan, Rural PA..."
          value={context.geography || ""}
          onChange={(e) =>
            onChange({ ...context, geography: e.target.value || undefined })
          }
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience" className="text-xs font-medium">
          Target Audience
        </Label>
        <Input
          id="audience"
          placeholder="e.g., Union members, Suburban..."
          value={context.audience || ""}
          onChange={(e) =>
            onChange({ ...context, audience: e.target.value || undefined })
          }
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="medium" className="text-xs font-medium">
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
          <SelectTrigger id="medium" className="h-9">
            <SelectValue placeholder="Select medium..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="speech">Stump Speech</SelectItem>
            <SelectItem value="ad">TV/Radio Ad</SelectItem>
            <SelectItem value="mailer">Direct Mail</SelectItem>
            <SelectItem value="digital">Digital/Social</SelectItem>
            <SelectItem value="canvass">Canvassing</SelectItem>
            <SelectItem value="debate">Debate/Town Hall</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
