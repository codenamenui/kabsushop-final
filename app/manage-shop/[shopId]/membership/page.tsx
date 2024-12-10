"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/supabase/clients/createClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Profile = {
  student_number: any;
  first_name: any;
  last_name: any;
  email: any;
  contact_number: any;
  section: any;
  year: any;
  colleges: {
    name: any;
  };
  programs: {
    name: any;
  };
};
type Profiles = Profile[];

const Membership = ({ params }: { params: { shopId: string } }) => {
  const [profiles, setProfiles] = useState<Profiles[]>([]);
  const [unmatchedEmails, setUnmatchedEmails] = useState<string[]>();

  useEffect(() => {
    const getMembers = async () => {
      const supabase = createClient();
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select(`id, email`)
        .eq("shop_id", params.shopId);
      const emails = memberships?.map((membership) => membership.email) ?? [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select(
          "student_number, first_name, last_name, email, contact_number, section, year, colleges(name), programs(name)",
        )
        .in("email", emails)
        .returns<Profiles>();

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      } else {
        const profileEmails = profiles?.map((profile) => profile.email) ?? [];
        const unmatchedEmails = emails.filter(
          (email) => !profileEmails.includes(email),
        );
        setUnmatchedEmails(unmatchedEmails);
        setProfiles(profiles ?? []);
      }
    };
    getMembers();
  }, []);
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shop Memberships</CardTitle>
            <AddMemberDialog shopId={params.shopId} />
          </div>
        </CardHeader>
        <CardContent>
          <h6>Unregistered Emails</h6>
          <ol>{unmatchedEmails?.map((email) => <li>{email}</li>)}</ol>
          <MembershipTable profiles={profiles ?? []} />
        </CardContent>
      </Card>
    </div>
  );
};

const AddMemberDialog = ({ shopId }: { shopId: string }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleAddMember = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.from("memberships").insert({
      shop_id: shopId,
      email: email,
    });

    if (error) {
      setError(error.message);
    } else {
      // Reset form and close dialog
      setEmail("");
      setError("");
      // You might want to add a way to close the dialog or refresh the list
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter member email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-red-500">{error}</p>}
          <Button onClick={handleAddMember}>Invite Member</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MembershipTable = ({ profiles }: { profiles: Profiles }) => (
  <div className="overflow-x-auto">
    <h6>Registered Members</h6>
    <table className="w-full table-auto border-collapse border border-gray-200">
      <thead className="bg-gray-100">
        <tr>
          <th className="border border-gray-300 px-4 py-2">Student Number</th>
          <th className="border border-gray-300 px-4 py-2">Name</th>
          <th className="border border-gray-300 px-4 py-2">Email</th>
          <th className="border border-gray-300 px-4 py-2">Contact</th>
          <th className="border border-gray-300 px-4 py-2">College</th>
          <th className="border border-gray-300 px-4 py-2">Program</th>
          <th className="border border-gray-300 px-4 py-2">Section</th>
          <th className="border border-gray-300 px-4 py-2">Year</th>
        </tr>
      </thead>
      <tbody>
        {profiles?.map((profile: Profile) => (
          <tr key={profile.student_number}>
            <td className="border border-gray-300 px-4 py-2">
              {profile.student_number}
            </td>
            <td className="border border-gray-300 px-4 py-2">{`${profile.first_name} ${profile.last_name}`}</td>
            <td className="border border-gray-300 px-4 py-2">
              {profile.email}
            </td>
            <td className="border border-gray-300 px-4 py-2">
              {profile.contact_number}
            </td>
            <td className="border border-gray-300 px-4 py-2">
              {profile.colleges?.name}
            </td>
            <td className="border border-gray-300 px-4 py-2">
              {profile.programs?.name}
            </td>
            <td className="border border-gray-300 px-4 py-2">
              {profile.section}
            </td>
            <td className="border border-gray-300 px-4 py-2">{profile.year}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Membership;
