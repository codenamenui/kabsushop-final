import { Orders } from "@/constants/type";
import { createServerClient } from "@/supabase/clients/createServer";
import React from "react";
import OrderAnalyticsDashboard from "./graph";

const Dashboard = async ({ params }: { params: { shopId: string } }) => {
  const supabase = createServerClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `
      id, 
      quantity, 
      price, 
      variants(id, name), 
      merchandises(name, merchandise_pictures(picture_url)), 
      profiles(
        student_number, 
        first_name, 
        last_name, 
        email, 
        contact_number,
        section,
        year,
        colleges(name), 
        programs(name)
      ), 
      order_statuses(
        id,
        paid, 
        received, 
        received_at, 
        cancelled, 
        cancelled_at, 
        cancel_reason
      )
    `,
    )
    .eq("shop_id", params.shopId)
    .returns<Orders[]>();
  return (
    <div>
      <OrderAnalyticsDashboard ini={orders ?? []} />
    </div>
  );
};

export default Dashboard;
