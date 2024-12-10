"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FullMerch } from "@/constants/type";
import MerchPictureDisplay from "./merch-pictures-display";
import ShopCard from "./shop-card";
import ConfirmOrderDialog from "./confirm-order";
import { createClient } from "@/supabase/clients/createClient";

const FullMerchDisplay = ({
  merch,
  membership,
}: {
  merch: FullMerch;
  membership: boolean;
}) => {
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [openConfirmation, setOpenConfirmation] = useState<boolean>(false);
  const [paymentOption, setPaymentOption] = useState<string>("none");
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [selectedMainImage, setSelectedMainImage] = useState<number>(0);

  const handleQuantityChange = (e: { target: { value: string } }) => {
    const value = parseInt(e.target.value);
    setQuantity(Math.max(1, value));
  };

  function handleCartUpload() {
    const cartUpload = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
        return;
      }

      const { error } = await supabase.from("cart_orders").insert([
        {
          user_id: user?.id,
          quantity: quantity,
          variant_id: merch.variants[selectedVariant].id,
          merch_id: merch.id,
          shop_id: merch.shops.id,
        },
      ]);

      if (error) {
        console.error(error);
        return;
      }
    };
    cartUpload();
  }

  function handleOrderSubmit() {
    const insert = async () => {
      if (paymentOption == "online") {
        if (paymentReceipt == null) {
          return;
        }
      }

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
        return;
      }

      const {
        data: { id: status_id },
        error: statusError,
      } = await supabase.from("order_statuses").insert([{}]).select().single();

      if (statusError) {
        console.error(statusError);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user?.id,
            quantity: quantity,
            online_payment: paymentOption == "online",
            physical_payment: paymentOption == "irl",
            variant_id: merch.variants[selectedVariant].id,
            merch_id: merch.id,
            shop_id: merch.shops.id,
            status_id: status_id,
            price: membership
              ? quantity * merch.variants[selectedVariant].membership_price
              : quantity * merch.variants[selectedVariant].original_price,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(error);
        return;
      }

      if (paymentOption == "online" && paymentReceipt != null) {
        const url = `payment_${data.id}_${Date.now()}`;
        const { error: storageError } = await supabase.storage
          .from("payment-picture")
          .upload(url, paymentReceipt);

        if (storageError) {
          console.error(storageError);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("payment-picture").getPublicUrl(url);

        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert([{ picture_url: publicUrl, order_id: data.id }]);

        if (paymentError) {
          console.error(paymentError);
          return;
        }
      }

      setOpenConfirmation(!openConfirmation);
      toast.success("Order placed successfully!");
    };
    insert();
  }

  const getPrice = (discount: boolean, quantity?: number): string => {
    let price;
    if (discount) {
      price = merch.variants[selectedVariant].membership_price;
    } else {
      price = merch.variants[selectedVariant].original_price;
    }
    if (quantity) {
      price *= quantity;
    }
    const displayPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(price);
    return displayPrice;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-8 md:flex-row">
        <MerchPictureDisplay
          merch={merch}
          selectedMainImage={selectedMainImage}
          setSelectedMainImage={setSelectedMainImage}
        />

        <div className="w-full space-y-6 md:w-1/2">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{merch.name}</h1>
            <div className="text-2xl font-semibold text-emerald-800">
              {getPrice(false)} {" | "} {getPrice(true)}
            </div>
          </div>

          <form className="space-y-4">
            <div className="flex gap-4">
              {/* Variants Field */}
              <div className="flex-1">
                <Label htmlFor="variant">{merch.variant_name}</Label>
                <Select
                  value={`${merch.variants[selectedVariant].id}`}
                  onValueChange={(val) => {
                    const id = merch.variants.findIndex((variant) => {
                      return variant.id == Number.parseInt(val);
                    });
                    setSelectedVariant(id);
                  }}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Variant" />
                  </SelectTrigger>

                  <SelectContent>
                    {merch.variants.map((variant) => (
                      <SelectItem key={variant.id} value={`${variant.id}`}>
                        {variant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity Field */}
            <div className="w-full">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={handleQuantityChange}
                className="w-full"
                required
              />
            </div>

            {/* Confirm Buttons */}
            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={() => {
                  handleCartUpload();
                  toast.success(`${merch.name} Added to cart successfully!`);
                }}
                variant="outline"
                className="flex-1"
              >
                Add to Cart
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOpenConfirmation(true);
                }}
                className="flex-1"
              >
                Buy Now
              </Button>
            </div>
          </form>

          <ShopCard shop={merch.shops} />

          <div>
            <h2 className="mb-2 text-xl font-semibold">Description</h2>
            <p className="text-gray-700">{merch.description}</p>
          </div>
        </div>
      </div>

      <ConfirmOrderDialog
        openConfirmation={openConfirmation}
        setOpenConfirmation={setOpenConfirmation}
        merch={merch}
        paymentOption={paymentOption}
        setPaymentOption={setPaymentOption}
        setPaymentReceipt={setPaymentReceipt}
        selectedVariant={selectedVariant}
        getPrice={getPrice}
        quantity={quantity}
        handleOrderSubmit={handleOrderSubmit}
        paymentReceipt={paymentReceipt}
        membership_status={membership}
      />
    </div>
  );
};

export default FullMerchDisplay;
