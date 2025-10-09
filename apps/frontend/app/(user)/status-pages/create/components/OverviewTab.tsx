"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

interface OverviewTabProps {
  isPublished: boolean;
  setIsPublished: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  logoLinkUrl: string;
  setLogoLinkUrl: (value: string) => void;
  supportUrl: string;
  setSupportUrl: (value: string) => void;
  historyRange: string;
  setHistoryRange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  mode: "create" | "edit";
}

export function OverviewTab({
  isPublished,
  setIsPublished,
  name,
  setName,
  logoUrl,
  setLogoUrl,
  logoLinkUrl,
  setLogoLinkUrl,
  supportUrl,
  setSupportUrl,
  historyRange,
  setHistoryRange,
  onSave,
  isSaving,
  hasChanges,
  mode,
}: OverviewTabProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-12">
      
      <div className="flex gap-12">
        <div className="w-1/3 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              Basic information
            </h2>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Billable
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A public status page informs your users about the uptime of your
            services.
          </p>
        </div>
        <div className="w-2/3">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground text-base">
                    Status page published
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make your page public
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground">
                    Published
                  </span>
                  <button
                    onClick={() => setIsPublished(!isPublished)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      isPublished ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPublished ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
                  >
                    Company name *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Stripe"
                    className="h-11 border-border bg-background"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="history"
                    className="text-sm font-medium text-foreground"
                  >
                    Status history
                  </Label>
                  <Select
                    value={historyRange}
                    onValueChange={setHistoryRange}
                  >
                    <SelectTrigger
                      id="history"
                      className="h-11 border-border bg-background"
                    >
                      <SelectValue placeholder="7 days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="90d">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      
      <div className="flex gap-12">
        <div className="w-1/3 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Links & URLs
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Where should we point your users when they want to visit your
            website?
          </p>
        </div>
        <div className="w-2/3">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="support"
                    className="text-sm font-medium text-foreground"
                  >
                    Get in touch URL
                  </Label>
                  <Input
                    id="support"
                    value={supportUrl}
                    onChange={(e) => setSupportUrl(e.target.value)}
                    placeholder="https://stripe.com/support"
                    className="h-11 border-border bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    You can use mailto:support@stripe.com. Leave blank for
                    no Get in touch button.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="logoLinkUrl"
                    className="text-sm font-medium text-foreground"
                  >
                    Logo URL (click-through)
                  </Label>
                  <Input
                    id="logoLinkUrl"
                    value={logoLinkUrl}
                    onChange={(e) => setLogoLinkUrl(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="h-11 border-border bg-background"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Logo
                  </Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => uploadInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result as string;
                        setLogoUrl(result);
                      };
                      reader.readAsDataURL(file);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        uploadInputRef.current?.click();
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Drag & drop or click to choose
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload a logo
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={uploadInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          setLogoUrl(result);
                        };
                        reader.readAsDataURL(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {logoUrl && (
                    <div className="mt-4 flex items-center gap-4">
                      <Image
                        src={logoUrl}
                        alt="Logo preview"
                        className="h-12 w-12 object-contain border rounded"
                        width={48}
                        height={48}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogoUrl("")}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-8">
        <Button
          onClick={onSave}
          disabled={isSaving || (mode === "edit" && !hasChanges)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
