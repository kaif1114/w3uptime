"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProposal } from "@/hooks/useProposals";
import { CreateProposalData, ProposalType } from "@/types/proposal";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function CreateProposalForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: ProposalType.FEATURE_REQUEST,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const createProposal = useCreateProposal();

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleInputChange("tags", [...(formData.tags || []), tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange(
      "tags",
      (formData.tags || []).filter((tag) => tag !== tagToRemove)
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 10) {
      newErrors.title = "Title must be at least 10 characters long";
    } else if (formData.title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 50) {
      newErrors.description = "Description must be at least 50 characters long";
    } else if (formData.description.length > 2000) {
      newErrors.description = "Description must be less than 2000 characters";
    }

    if (!formData.type) {
      newErrors.type = "Proposal type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const proposalData: CreateProposalData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        tags: formData.tags,
      };

      await createProposal.mutateAsync(proposalData);
      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to create proposal:", error);
      setErrors({ submit: "Failed to create proposal. Please try again." });
    }
  };

  const getProposalTypeInfo = (type: ProposalType) => {
    if (type === ProposalType.FEATURE_REQUEST) {
      return {
        icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
        title: "Feature Request",
        description: "Suggest new functionality or features for W3Uptime",
        examples: [
          "Add support for new monitoring protocols",
          "Implement advanced alerting systems",
          "Create new dashboard widgets",
          "Add integration with third-party services",
        ],
      };
    } else {
      return {
        icon: <Settings className="h-5 w-5 text-green-500" />,
        title: "Change Request",
        description:
          "Suggest improvements or modifications to existing features",
        examples: [
          "Improve the user interface design",
          "Enhance performance of existing features",
          "Modify notification settings",
          "Update API endpoints",
        ],
      };
    }
  };

  const typeInfo = getProposalTypeInfo(formData.type);

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Proposal Submitted Successfully!
          </h3>
          <p className="text-muted-foreground text-center mb-6">
            Thank you for your contribution. Your proposal is now under review
            by the community.
          </p>
          <div className="flex space-x-4">
            <Link href="/community">
              <Button>View All Proposals</Button>
            </Link>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Submit Another Proposal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader>
          <CardTitle>Choose Proposal Type</CardTitle>
          <CardDescription>
            Select the type that best describes your proposal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.type}
            onValueChange={(value: ProposalType) =>
              handleInputChange("type", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ProposalType.FEATURE_REQUEST}>
                Feature Request
              </SelectItem>
              <SelectItem value={ProposalType.CHANGE_REQUEST}>
                Change Request
              </SelectItem>
            </SelectContent>
          </Select>

          {errors.type && (
            <p className="text-sm text-red-500 mt-1">{errors.type}</p>
          )}
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            {typeInfo.icon}
            <CardTitle>{typeInfo.title}</CardTitle>
          </div>
          <CardDescription>{typeInfo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm font-medium">Examples:</p>
            <ul className="space-y-1">
              {typeInfo.examples.map((example, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex items-start"
                >
                  <span className="text-primary mr-2">•</span>
                  {example}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
          <CardDescription>
            Provide clear and detailed information about your proposal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter a clear, descriptive title for your proposal"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/100 characters
              </p>
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your proposal in detail. Include the problem it solves, benefits, and any implementation considerations."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={8}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/2000 characters
              </p>
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex space-x-2">
                <Input
                  id="tags"
                  placeholder="Add tags to help categorize your proposal"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tags help others find and categorize your proposal
              </p>
            </div>

            
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            
            <div className="flex justify-between">
              <Link href="/community">
                <Button type="button" variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createProposal.isPending}
                className="min-w-[120px]"
              >
                {createProposal.isPending ? "Submitting..." : "Submit Proposal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
