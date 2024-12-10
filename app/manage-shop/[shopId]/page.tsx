import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import React from "react";
import Link from "next/link";
import { deleteMerch } from "@/app/manage-shop/[shopId]/actions";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MdDelete } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Merch, ShopManagementType } from "@/constants/type";
import ShopManageCard from "@/components/shop-manage-card";
import MerchandiseDisplay from "@/components/merchandise-display";
import MerchManageCard from "@/components/merch-manage-card";

const ShopManagement = async ({ params }: { params: { shopId: string } }) => {
  const supabase = createServerComponentClient({ cookies });

  // Fetch shop data with error handling
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select(
      "id, name, email, socmed_url, logo_url, colleges(id, name), acronym",
    )
    .eq("id", params.shopId)
    .returns<ShopManagementType>()
    .single();

  if (shopError || !shop) {
    return <div>Shop not found</div>;
  }

  // Fetch merchandise data
  const { data: merchs, error: merchError } = await supabase
    .from("merchandises")
    .select(
      `
        id, 
        name, 
        created_at,
        merchandise_pictures(picture_url), 
        variants(original_price, membership_price), 
        shops!inner(id, name, acronym)
      `,
    )
    .eq("shop_id", params.shopId)
    .returns<Merch[]>();

  return (
    <div className="flex justify-center p-2">
      <div className="flex flex-col gap-4">
        {/* Shop Information Card */}
        <ShopManageCard shop={shop} />

        {/* Action Buttons */}
        <div className="space-x-2">
          <Button asChild>
            <Link href={`/manage-shop/${params.shopId}/merch/new`}>
              Add Merchandise
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/manage-shop/${params.shopId}/dashboard`}>Manage</Link>
          </Button>
        </div>

        {/* Merchandise Grid */}
        <div className="grid grid-cols-4 gap-4">
          {merchs?.map((merch) => (
            <MerchManageCard merch={merch} params={params} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopManagement;
