"use client";

import React, { useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FetchedMerch } from "@/constants/type";
import { Category } from "@/constants/type";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { createClient } from "@/supabase/clients/createClient";
import { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { revalidatePath } from "next/cache";

interface MerchFormProps {
  merch?: FetchedMerch;
  categories: Category[];
  shopId: string;
}

const ModifyMerch: React.FC<MerchFormProps> = ({
  merch,
  categories,
  shopId,
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<FetchedMerch>>({
    name: merch?.name || "",
    description: merch?.description || "",
    receiving_information: merch?.receiving_information || "",
    variant_name: merch?.variant_name || "",
    online_payment: merch?.online_payment || false,
    physical_payment: merch?.physical_payment || false,
    cancellable: merch?.cancellable || false,
    merchandise_pictures: merch?.merchandise_pictures || [],
    variants: merch?.variants || [],
    merchandise_categories: merch?.merchandise_categories || [],
  });

  const [newVariant, setNewVariant] = useState({
    picture_url: "",
    name: "",
    original_price: 0,
    membership_price: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (field: keyof FetchedMerch) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);

      // Create new picture objects with temporary blob URLs
      const newPictureObjects = fileArray.map((file) => ({
        picture_url: URL.createObjectURL(file),
        file: file, // Store the actual file for later upload
      }));

      setFormData((prev) => ({
        ...prev,
        merchandise_pictures: [
          ...(prev.merchandise_pictures || []),
          ...newPictureObjects,
        ],
      }));
    }
  };

  const handleAddVariant = () => {
    if (newVariant.name && newVariant.original_price > 0) {
      setFormData((prev) => ({
        ...prev,
        variants: [...(prev.variants || []), newVariant],
      }));
      setNewVariant({
        picture_url: "",
        name: "",
        original_price: 0,
        membership_price: 0,
      });
    }
  };

  const handleRemovePicture = (index: number) => {
    const pictureToRemove = formData.merchandise_pictures?.[index];

    // If it's a temporary blob URL, revoke it
    if (pictureToRemove?.picture_url.startsWith("blob:")) {
      URL.revokeObjectURL(pictureToRemove.picture_url);
    }

    setFormData((prev) => ({
      ...prev,
      merchandise_pictures: prev.merchandise_pictures?.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleCategoryChange = (categoryId: number) => {
    setFormData((prev) => ({
      ...prev,
      merchandise_categories: [{ cat_id: categoryId }],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabase = createClient();

      // Determine if we're inserting a new merchandise or updating an existing one
      let merchandiseId;
      if (merch?.id) {
        // Update existing merchandise
        const { data, error: updateError } = await supabase
          .from("merchandises")
          .update({
            name: formData.name,
            description: formData.description,
            online_payment: formData.online_payment,
            physical_payment: formData.physical_payment,
            cancellable: formData.cancellable,
            receiving_information: formData.receiving_information,
          })
          .eq("id", merch.id)
          .select("id");

        if (updateError) throw updateError;
        merchandiseId = merch.id;
      } else {
        // Insert new merchandise
        const { data, error: insertError } = await supabase
          .from("merchandises")
          .insert({
            name: formData.name,
            description: formData.description,
            shop_id: merch?.shops.id ?? shopId,
            online_payment: formData.online_payment,
            physical_payment: formData.physical_payment,
            cancellable: formData.cancellable,
            receiving_information: formData.receiving_information,
            variant_name: formData.variant_name,
          })
          .select("id");

        console.log(formData);
        if (insertError) throw insertError;
        merchandiseId = data?.[0]?.id;
      }

      // Handle picture uploads and deletions
      await handleMerchandisePictures(supabase, merchandiseId, formData);
      const { data: variants, error: merch_error } = await supabase
        .from("variants")
        .select("id")
        .eq("merch_id", merch?.id ?? -1);
      console.log(formData.variants);
      for (let i = 0; i < formData.variants.length; i++) {
        if (
          variants?.some((variant) => variant.id === formData.variants[i].id)
        ) {
          const { data, error: merch_error } = await supabase
            .from("variants")
            .update({
              name: formData.variants[i].name,
              original_price: formData.variants[i].original_price,
              membership_price: formData.variants[i].membership_price,
              picture_url: "",
            })
            .eq("id", formData.variants[i].id)
            .select();
          if (merch_error) {
            throw merch_error;
          }
        } else {
          const { data, error: merch_error } = await supabase
            .from("variants")
            .insert([
              {
                name: formData.variants[i].name,
                original_price: formData.variants[i].original_price,
                membership_price: formData.variants[i].membership_price,
                picture_url: "",
                merch_id: merchandiseId,
              },
            ]);
          if (merch_error) {
            throw merch_error;
          }
        }
      }
      if (merch_error) {
        throw merch_error;
      }
      router.push(`/manage-shop/${shopId}`);
      router.refresh();
      toast.success("Merchandise saved successfully");
    } catch (error) {
      console.error("Error in merchandise submission:", error);
      toast.error("Failed to save merchandise");
    }
  };

  const handleMerchandisePictures = async (
    supabase: SupabaseClient,
    merchandiseId: number,
    formData: Partial<FetchedMerch>,
  ) => {
    // Fetch existing pictures from the database
    const { data: existingPictures, error: fetchError } = await supabase
      .from("merchandise_pictures")
      .select("picture_url")
      .eq("merch_id", merchandiseId);

    if (fetchError) {
      throw fetchError;
    }

    // Determine pictures to delete (those in existing pictures but not in current form data)
    const picturesToDelete =
      existingPictures?.filter((existingPic) => {
        const isInFormData = formData.merchandise_pictures?.some(
          (formPic) => formPic.picture_url === existingPic.picture_url,
        );
        return !isInFormData;
      }) || [];

    // Remove pictures from storage and database
    for (const pictureToDelete of picturesToDelete) {
      try {
        // Extract file path from the full URL
        const filePath = pictureToDelete.picture_url
          .split("/")
          .slice(-2)
          .join("/");

        // Remove from storage
        await supabase.storage.from("merch-picture").remove([filePath]);

        // Remove from database
        await supabase
          .from("merchandise_pictures")
          .delete()
          .eq("picture_url", pictureToDelete.picture_url);
      } catch (deleteError) {
        console.error("Error deleting picture:", deleteError);
      }
    }

    // Upload new pictures (those with blob URLs)
    const newPicturesToUpload =
      formData.merchandise_pictures?.filter(
        (pic) => pic.file && pic.picture_url.startsWith("blob:"),
      ) || [];

    for (const newPic of newPicturesToUpload) {
      try {
        if (!newPic.file) continue;

        // Generate unique filename
        const merch_url = `merch_${formData.name}_${Date.now()}_${newPic.file.name}`;

        // Upload to storage
        const { data: uploadData, error: storageError } = await supabase.storage
          .from("merch-picture")
          .upload(merch_url, newPic.file);

        if (storageError) throw storageError;

        // Get public URL
        const {
          data: { publicUrl: merchUrl },
        } = supabase.storage.from("merch-picture").getPublicUrl(merch_url);

        // Insert picture record
        const { error: pictureError } = await supabase
          .from("merchandise_pictures")
          .insert({
            picture_url: merchUrl,
            merch_id: merchandiseId,
          });

        if (pictureError) throw pictureError;

        // Revoke blob URL
        URL.revokeObjectURL(newPic.picture_url);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }
  };

  // Add this method inside the ModifyMerch component, before the return statement
  const handleVariantChange = (
    index: number,
    field: "name" | "original_price" | "membership_price",
    value: string | number,
  ) => {
    setFormData((prev) => {
      // Create a copy of the variants array
      const updatedVariants = [...(prev.variants || [])];

      // Update the specific variant at the given index
      if (updatedVariants[index]) {
        updatedVariants[index] = {
          ...updatedVariants[index],
          [field]: value,
        };
      }

      return {
        ...prev,
        variants: updatedVariants,
      };
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            {merch ? "Modify Merchandise" : "Create New Merchandise"}
          </CardTitle>
          <CardDescription>
            {merch
              ? "Update the details of existing merchandise"
              : "Add a new merchandise item"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Merchandise Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Variant Name</Label>
              <Input
                name="variant_name"
                value={formData.variant_name}
                onChange={handleInputChange}
                placeholder="Variant Name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Merchandise Description"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Receiving Information</Label>
            <Textarea
              name="receiving_information"
              value={formData.receiving_information}
              onChange={handleInputChange}
              placeholder="How and where to receive the merchandise"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.merchandise_categories?.[0]?.cat_id?.toString()}
              onValueChange={(value) => handleCategoryChange(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment and Cancellation Options */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="online_payment"
                checked={formData.online_payment}
                onCheckedChange={() => handleCheckboxChange("online_payment")}
              />
              <Label htmlFor="online_payment">Online Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="physical_payment"
                checked={formData.physical_payment}
                onCheckedChange={() => handleCheckboxChange("physical_payment")}
              />
              <Label htmlFor="physical_payment">Physical Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cancellable"
                checked={formData.cancellable}
                onCheckedChange={() => handleCheckboxChange("cancellable")}
              />
              <Label htmlFor="cancellable">Cancellable</Label>
            </div>
          </div>

          {/* Merchandise Pictures */}
          <div className="space-y-2">
            <Label>Merchandise Pictures</Label>

            {formData.merchandise_pictures &&
              formData.merchandise_pictures.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {formData.merchandise_pictures.map((pic, index) => (
                    <div key={`pic-${index}`} className="relative">
                      <img
                        src={pic.picture_url}
                        alt={`Merchandise pic ${index + 1}`}
                        className="h-20 w-20 rounded object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-0 top-0 h-6 w-6 rounded-full p-1"
                        onClick={() => handleRemovePicture(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

            <div className="flex items-center gap-2">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Upload Pictures
              </Button>
            </div>
          </div>

          {/* Variants Section */}
          <div className="space-y-2">
            <Label>Variants</Label>
            {formData.variants &&
              formData.variants.map((variant, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 items-center gap-2"
                >
                  <Input
                    value={variant.name}
                    onChange={(e) =>
                      handleVariantChange(index, "name", e.target.value)
                    }
                    placeholder="Variant Name"
                  />
                  <Input
                    type="number"
                    value={variant.original_price}
                    onChange={(e) =>
                      handleVariantChange(
                        index,
                        "original_price",
                        Number(e.target.value),
                      )
                    }
                    placeholder="Original Price"
                  />
                  <Input
                    type="number"
                    value={variant.membership_price}
                    onChange={(e) =>
                      handleVariantChange(
                        index,
                        "membership_price",
                        Number(e.target.value),
                      )
                    }
                    placeholder="Membership Price"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        variants: prev.variants?.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            <div className="grid grid-cols-4 items-center gap-2">
              <Input
                value={newVariant.name}
                onChange={(e) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="New Variant Name"
              />
              <Input
                type="number"
                value={newVariant.original_price}
                onChange={(e) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    original_price: Number(e.target.value),
                  }))
                }
                placeholder="Original Price"
              />
              <Input
                type="number"
                value={newVariant.membership_price}
                onChange={(e) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    membership_price: Number(e.target.value),
                  }))
                }
                placeholder="Membership Price"
              />
              <Button type="button" onClick={handleAddVariant}>
                Add Variant
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            {merch ? "Update Merchandise" : "Create Merchandise"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ModifyMerch;
