import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth";
import { navForRole, type NavItem } from "@/lib/nav";

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return C ? <C className={className} /> : <Icons.Circle className={className} />;
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const groups = navForRole(role);

  const handleSelect = (item: NavItem) => {
    onOpenChange(false);
    void navigate({ to: item.to, search: item.search ?? {} });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Cari menu atau navigasi..." />
      <CommandList>
        <CommandEmpty>Tidak ada menu yang cocok.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={`${group.label}-${item.to}-${item.label}`}
                value={`${group.label} ${item.label}`}
                onSelect={() => handleSelect(item)}
                className="cursor-pointer"
              >
                <Icon name={item.icon} className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
