"use client";

import React, { useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { College, FullShopInfo } from "@/constants/type";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/supabase/clients/createClient";

const ShopProfilePage = ({
  shop,
  colleges,
}: {
  shop?: FullShopInfo;
  colleges: College[];
}) => {
  // Initial state based on the FullShopInfo type
  const [shopInfo, setShopInfo] = useState({
    id: shop?.id ?? "",
    name: shop?.name ?? "",
    email: shop?.email ?? "",
    socmed_url: shop?.socmed_url ?? "",
    logo_url: shop?.logo_url ?? "",
    logo_file: null as File | null,
    colleges: {
      id: shop?.colleges.id ?? -1,
      name: shop?.colleges.name ?? "",
    },
    acronym: shop?.acronym ?? "",
  });

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Handle top-level fields
    setShopInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for logo file input
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a URL for the file to preview
      const logoPreviewUrl = URL.createObjectURL(file);

      setShopInfo((prev) => ({
        ...prev,
        logo_file: file,
        logo_url: logoPreviewUrl,
      }));
    }
  };

  // Handler for college selection
  const handleCollegeChange = (collegeId: string) => {
    const selectedCollege = colleges.find(
      (college) => college.id === Number(collegeId),
    );

    setShopInfo((prev) => ({
      ...prev,
      colleges: {
        id: selectedCollege ? selectedCollege.id : -1,
        name: selectedCollege ? selectedCollege.name : "",
      },
    }));
  };

  // Submit handler (you would typically send this to an API)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create Supabase client
    const submit = async () => {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        toast.error("Authentication error");
        console.error(userError);
        return null;
      }

      // Prepare update object for shops table
      const updatePayload: Partial<FullShopInfo> = {
        name: shopInfo.name,
        email: shopInfo.email,
        socmed_url: shopInfo.socmed_url,
        acronym: shopInfo.acronym,
      };

      // Handle logo file upload if provided
      let logoUrl = "";
      if (shopInfo.logo_file) {
        try {
          // Generate unique filename
          const fileName = `shop_logo_${shopInfo.id}_${Date.now()}`;

          // Upload logo
          const { error: storageError } = await supabase.storage
            .from("shop-picture")
            .upload(fileName, shopInfo.logo_file);

          if (storageError) {
            toast.error("Failed to upload logo");
            console.error(storageError);
            return null;
          }

          // Get public URL of uploaded logo
          const { data: urlData } = supabase.storage
            .from("shop-picture")
            .getPublicUrl(fileName);

          logoUrl = urlData.publicUrl;
          updatePayload.logo_url = logoUrl;
        } catch (error) {
          toast.error("Unexpected error uploading logo");
          console.error(error);
          return null;
        }
      }

      // Handle college update
      if (shopInfo.colleges?.id) {
        updatePayload.college_id = shopInfo.colleges.id;
      }

      // Update shop in database
      const { data, error } = await supabase
        .from("shops")
        .update(updatePayload)
        .eq("id", shop?.id)
        .select()
        .single();

      if (error) {
        toast.error("Failed to update shop profile");
        console.error(error);
        return null;
      }

      // Success notification
      toast.success("Shop profile updated successfully!");
    };
    submit();
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Shop Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Shop Name</Label>
              <Input
                id="name"
                name="name"
                value={shopInfo.name}
                onChange={handleInputChange}
                placeholder="Enter shop name"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={shopInfo.email}
                onChange={handleInputChange}
                placeholder="Enter shop email"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="socmed_url">Social Media URL</Label>
              <Input
                id="socmed_url"
                name="socmed_url"
                value={shopInfo.socmed_url}
                onChange={handleInputChange}
                placeholder="Enter social media URL"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="logo">Shop Logo</Label>
              <Input
                id="logo"
                name="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="mt-2"
              />
              {shopInfo.logo_url && (
                <div className="mt-2">
                  <Image
                    src={shopInfo.logo_url}
                    alt="Shop Logo Preview"
                    width={100}
                    height={100}
                    className="rounded object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>College</Label>
              <Select
                onValueChange={handleCollegeChange}
                value={shopInfo.colleges.id.toString()}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id.toString()}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="acronym">Acronym</Label>
              <Input
                id="acronym"
                name="acronym"
                value={shopInfo.acronym}
                onChange={handleInputChange}
                placeholder="Enter shop acronym"
                className="mt-2"
              />
            </div>

            <Button type="submit" className="mt-4 w-full">
              Update Shop Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopProfilePage;
