"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useGovernanceContract } from "@/hooks/useGovernanceContract";
import { useOnChainReputation } from "@/hooks/useOnChainReputation";
import { useSession } from "@/hooks/useSession";
import { generateContentHash } from "@/lib/governance";
import { CreateProposalData, ProposalType } from "@/types/proposal";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  Settings,
  Shield,
  Loader2,
  ExternalLink,
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

  // On-chain creation state
  const [createOnChain, setCreateOnChain] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const createProposal = useCreateProposal();
  const {
    isConnected,
    error: contractError,
    createProposal: createOnChainProposal,
  } = useGovernanceContract();

  // Reputation check for on-chain proposals
  const { data: session } = useSession();
  const {
    data: reputationData,
    isLoading: isLoadingReputation,
  } = useOnChainReputation();

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

    setTxPending(createOnChain);
    setErrors({}); // Clear previous errors

    try {
      let creationTxHash: string | undefined;

      // Step 1: Create proposal on-chain if requested
      if (createOnChain) {
        if (!isConnected) {
          setErrors({
            submit:
              "Please connect MetaMask to create on-chain proposal. Switch to Sepolia testnet.",
          });
          setTxPending(false);
          return;
        }

        try {
          const contentHash = generateContentHash(
            formData.title.trim(),
            formData.description.trim()
          );
          const votingDuration = 7 * 24 * 60 * 60; // 7 days

          console.log("Creating proposal on-chain with content hash:", contentHash);

          const result = await createOnChainProposal(contentHash, votingDuration);
          creationTxHash = result.txHash;
          setTxHash(creationTxHash);

          console.log(`✅ Proposal created on-chain: ID ${result.proposalId}, tx ${creationTxHash}`);
        } catch (error: unknown) {
          console.error("On-chain creation failed:", error);

          // Parse MetaMask-specific errors
          const err = error as { code?: number | string; message?: string };
          if (err.code === 4001 || err.code === "ACTION_REJECTED") {
            setErrors({ submit: "Transaction rejected. Please try again." });
          } else if (err.message?.includes("insufficient funds")) {
            setErrors({
              submit:
                "Insufficient ETH for gas fees. Please add Sepolia ETH to your wallet.",
            });
          } else if (
            err.message?.includes("network") ||
            err.message?.includes("chainId")
          ) {
            setErrors({
              submit: "Please connect to Sepolia testnet in MetaMask.",
            });
          } else {
            setErrors({
              submit: `On-chain creation failed: ${err.message || "Unknown error"}`,
            });
          }
          setTxPending(false);
          return;
        }
      }

      // Step 2: Submit to database with on-chain data
      const proposalData: CreateProposalData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        tags: formData.tags,
        createOnChain,
        txHash: creationTxHash,
      };

      await createProposal.mutateAsync(proposalData);
      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to create proposal:", error);
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("Insufficient reputation")) {
        setErrors({
          submit:
            "Your reputation score is too low to create proposals. Keep validating and depositing to increase it.",
        });
      } else if (message.includes("Transaction verification failed")) {
        setErrors({
          submit:
            "On-chain transaction verification failed. Please try again or contact support.",
        });
      } else if (message.includes("Content hash mismatch")) {
        setErrors({
          submit: "Proposal content verification failed. Please try again.",
        });
      } else {
        setErrors({
          submit: "Failed to create proposal. Please try again.",
        });
      }
    } finally {
      setTxPending(false);
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

            {/* On-Chain Creation Toggle */}
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createOnChain"
                    checked={createOnChain}
                    onCheckedChange={(checked) => setCreateOnChain(checked === true)}
                  />
                  <Label htmlFor="createOnChain" className="cursor-pointer font-medium">
                    Create On-Chain (Blockchain Verified)
                  </Label>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Shield className="mr-1 h-3 w-3" />
                  Recommended
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                On-chain proposals are immutably recorded on the Sepolia blockchain,
                providing transparent and verifiable voting. Requires MetaMask transaction and gas fees.
              </p>

              {createOnChain && (
                <div className="mt-2 space-y-2">
                  {/* MetaMask connection error */}
                  {!isConnected && contractError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{contractError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Transaction submitted */}
                  {txHash && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Transaction submitted:{" "}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-mono"
                        >
                          {txHash.slice(0, 10)}...
                        </a>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>


            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-gray-200">
                  {errors.submit}
                </AlertDescription>
              </Alert>
            )}

            {/* Reputation Check Warning for On-Chain Proposals */}
            {createOnChain && reputationData && !reputationData.canCreateProposal && (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="ml-2 space-y-2">
                  <p className="font-medium text-orange-900 dark:text-orange-100">
                    Insufficient On-Chain Reputation
                  </p>
                  <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                    <p>
                      Required: 500 REP | Your Balance: {reputationData.onChainBalance ?? 0} REP
                    </p>
                    {reputationData.availableToClaimPoints > 0 && (
                      <p className="font-medium">
                        You have {reputationData.availableToClaimPoints} REP available to claim!
                      </p>
                    )}
                  </div>
                  <Link
                    href="/community/reputation"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    Claim Reputation <ExternalLink className="h-3 w-3" />
                  </Link>
                </AlertDescription>
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
                disabled={
                  createProposal.isPending ||
                  txPending ||
                  isLoadingReputation ||
                  (createOnChain && reputationData && !reputationData.canCreateProposal)
                }
                className="min-w-[160px]"
              >
                {isLoadingReputation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Reputation...
                  </>
                ) : txPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {createOnChain ? "Creating On-Chain..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    {createOnChain && <Shield className="mr-2 h-4 w-4" />}
                    {createOnChain ? "Create On-Chain Proposal" : "Submit Proposal"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
