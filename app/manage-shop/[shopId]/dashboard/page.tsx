"use client";

import { createClient } from "@/supabase/clients/createClient";
import { useEffect, useState } from "react";

function groupOrders(orders) {
  // Initialize result arrays for different groupings
  const groupedByCollege = [];
  const groupedByMerchId = [];
  const groupedByOrderStatus = [];

  // Helper function to find or create an entry in a group array
  function findOrCreate(group, key, keyName) {
    let entry = group.find((item) => item[keyName] === key);
    if (!entry) {
      entry = { [keyName]: key, quantities: 0, orders: 0, orderDetails: [] };
      group.push(entry);
    }
    return entry;
  }

  orders.forEach((order) => {
    // Group by College Name and count quantities
    if (order.profiles?.colleges?.name) {
      const collegeName = order.profiles.colleges.name;
      const collegeEntry = findOrCreate(
        groupedByCollege,
        collegeName,
        "college",
      );

      // Increment totals
      collegeEntry.orders++;
      collegeEntry.quantities += order.quantity || 0;
      collegeEntry.orderDetails.push(order);
    }

    // Group by Merch ID and count quantities
    if (order.merch_id) {
      const merchEntry = findOrCreate(
        groupedByMerchId,
        order.merch_id,
        "merch_id",
      );

      // Increment totals
      merchEntry.orders++;
      merchEntry.quantities += order.quantity || 0;
      merchEntry.orderDetails.push(order);
    }

    // Group by Order Status and count quantities
    const status = getOrderStatus(order);
    const statusEntry = findOrCreate(groupedByOrderStatus, status, "status");

    // Increment totals
    statusEntry.orders++;
    statusEntry.quantities += order.quantity || 0;
    statusEntry.orderDetails.push(order);
  });

  return {
    byCollege: groupedByCollege,
    byMerchId: groupedByMerchId,
    byOrderStatus: groupedByOrderStatus,
  };
}

// Helper function to determine order status
function getOrderStatus(order) {
  if (order.order_statuses?.cancelled) return "Cancelled";
  if (order.order_statuses?.received) return "Received";
  if (order.order_statuses?.paid) return "Paid";
  return "Pending";
}

// Process orders with comprehensive query
async function processOrders(shopId: string) {
  const supabase = createClient();
  const { data: orders, error } = await supabase.from("orders").select(
    `
      id, 
      created_at, 
      merch_id, 
      quantity, 
      price,
      profiles(colleges(id, name)),
      merchandises (
        id,
        name,
        merchandise_categories (
          categories (
            id,
            name
          )
        )
      ),
      order_statuses (
        id,
        paid, 
        received, 
        received_at, 
        cancelled, 
        cancelled_at, 
        cancel_reason
      )
    `,
  );
  // .eq("shop_id", shopId);

  if (error) {
    console.error("Error fetching orders:", error);
    return null;
  }

  return groupOrders(orders);
}

type Order = {
  id: string;
  created_at: string;
  merch_id: string;
  quantity: number;
  price: number;
  profiles: {
    colleges: {
      id: string;
      name: string;
    };
  } | null;
  merchandises: {
    id: string;
    name: string;
    merchandise_categories: {
      categories: {
        id: string;
        name: string;
      };
    };
  } | null;
  order_statuses: {
    id: string;
    paid: boolean;
    received: boolean;
    received_at: string | null;
    cancelled: boolean;
    cancelled_at: string | null;
    cancel_reason: string | null;
  } | null;
};

// Type for the query result
type OrderQueryResult = {
  data: Order[] | null;
  error: Error | null;
};

type GroupedOrders = {
  byCollege: Record<
    string,
    {
      totalOrders: number;
      totalQuantity: number;
      orders: Order[];
    }
  >;
  byMerchId: Record<
    string,
    {
      totalOrders: number;
      totalQuantity: number;
      orders: Order[];
    }
  >;
  byOrderStatus: Record<
    string,
    {
      totalOrders: number;
      totalQuantity: number;
      orders: Order[];
    }
  >;
};

const Dashboard = ({ params }: { params: { shopId: string } }) => {
  const [orders, setOrders] = useState<GroupedOrders>();
  useEffect(() => {
    const getData = async () => {
      const orders = await processOrders(params.shopId);
      console.log(orders);
      setOrders(orders);
    };
    getData();
  }, []);
  // console.log(orders);
  return <div className="container mx-auto p-4"></div>;
};

export default Dashboard;
