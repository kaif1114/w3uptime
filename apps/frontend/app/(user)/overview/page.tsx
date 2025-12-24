'use client';

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChatContext } from "@/providers/ChatContextProvider";

export default function OverviewPage() {
  const { setContext } = useChatContext();

  useEffect(() => {
    setContext({ pageType: 'dashboard' });

    return () => {
      setContext(null);
    };
  }, [setContext]);
  return (
    <div className="">
      <div className="flex flex-col lg:flex-row gap-8">
        
        <div className="lg:w-1/3 space-y-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Basic information
              </h2>
              <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                Billable
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              A public status page informs your users about the uptime of your
              services.
            </p>
          </div>

          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Links & URLs
            </h2>
            <p className="text-sm text-muted-foreground">
              Where should we point your users when they want to visit your
              website?
            </p>
          </div>
        </div>

        
        <div className="lg:w-2/3">
          <Card className="w-full">
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company name *</Label>
                    <Input
                      id="company-name"
                      defaultValue="Cores Connect"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain *</Label>
                    <div className="flex">
                      <Input
                        id="subdomain"
                        defaultValue="cores-connect"
                        className="rounded-r-none"
                      />
                      <div className="flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground">
                        .betteruptime.com
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can configure a custom domain below.
                </p>
              </div>

              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-url">
                      What URL should your logo point to?
                    </Label>
                    <Input
                      id="logo-url"
                      defaultValue="https://stripe.com"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-url">Get in touch URL</Label>
                    <Input
                      id="contact-url"
                      defaultValue="https://stripe.com/support"
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can use mailto:support@stripe.com. Leave blank for no Get
                  in touch button.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
