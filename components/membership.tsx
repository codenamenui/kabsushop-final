import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/supabase/clients/createClient";
import { createServerClient } from "@/supabase/clients/createServer";

type Shop = {
  id: number;
  name: string;
};

const Membership = async () => {
  const supabase = createServerClient();
  const { data: shops } = await supabase
    .from("shops")
    .select("id, name, acronym")
    .returns<Shop[]>();

  const verify = async (formData: FormData) => {
    "use server";

    const supabase = createServerClient();
    const organization = formData.get("organization");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error: selectError } = await supabase
      .from("membership_requests")
      .select()
      .eq("user_id", user?.id)
      .eq("shop_id", organization)
      .single();

    if (data == null) {
      const { error: memError } = await supabase
        .from("membership_requests")
        .insert([{ user_id: user?.id, shop_id: organization }]);
    }
  };

  return (
    <form action={verify} className="space-y-4">
      <div>
        <Label htmlFor="organization">Organization</Label>
        <Select name="organization" required>
          <SelectTrigger id="organization">
            <SelectValue placeholder="Select a college..." />
          </SelectTrigger>
          <SelectContent>
            {shops?.map((shop) => (
              <SelectItem key={shop.id} value={shop.id.toString()}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        Verify
      </Button>
    </form>
  );
};

export default Membership;
