import {
  CheckSquare,
  List,
  MoreHorizontal,
  RefreshCw,
  Square,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";

type Props = { name: "upload" | "refresh" | "select" | "selectOff" | "loose" | "trash" | "tags" | "more" };

const iconProps = {
  size: 20,
  strokeWidth: 2.25,
  "aria-hidden": true as const,
};

export default function ToolbarIcon({ name }: Props) {
  switch (name) {
    case "upload":
      return <Upload {...iconProps} />;
    case "refresh":
      return <RefreshCw {...iconProps} />;
    case "select":
      return <CheckSquare {...iconProps} />;
    case "selectOff":
      return <Square {...iconProps} />;
    case "loose":
      return <List {...iconProps} />;
    case "trash":
      return <Trash2 {...iconProps} />;
    case "tags":
      return <Tag {...iconProps} />;
    case "more":
      return <MoreHorizontal {...iconProps} />;
  }
}
