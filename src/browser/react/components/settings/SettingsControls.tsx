import * as React from 'react';

import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

export const SettingsPageLayout: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="mx-auto w-full max-w-3xl pb-8">
    <header className="mb-6 border-b border-border pb-4">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </header>
    <div className="flex flex-col gap-6">{children}</div>
  </section>
);

interface RowProps {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export const CheckboxRow: React.FC<RowProps> = ({
  id,
  label,
  help,
  checked,
  onChange,
}) => (
  <div className="flex items-start gap-3">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(value) => onChange(value === true)}
      className="mt-0.5"
    />
    <Label htmlFor={id} className="flex flex-col gap-1">
      <span>{label}</span>
      <small className="font-normal text-muted-foreground">{help}</small>
    </Label>
  </div>
);

export const SwitchRow: React.FC<RowProps> = ({
  id,
  label,
  help,
  checked,
  onChange,
}) => (
  <div className="flex items-start gap-3">
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="mt-0.5"
    />
    <Label htmlFor={id} className="flex flex-col gap-1">
      <span>{label}</span>
      <small className="font-normal text-muted-foreground">{help}</small>
    </Label>
  </div>
);
