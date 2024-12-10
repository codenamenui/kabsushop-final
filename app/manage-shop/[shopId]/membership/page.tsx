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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  CalendarDays,
} from "lucide-react";

type Profile = {
  student_number: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  section: string;
  year: string;
  colleges: {
    name: string;
  };
  programs: {
    name: string;
  };
};

type Profiles = Profile[];

const Membership = ({ params }: { params: { shopId: string } }) => {
  const [profiles, setProfiles] = useState<Profiles>([]);
  const [unmatchedEmails, setUnmatchedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getMembers = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: memberships, error: membershipError } = await supabase
          .from("memberships")
          .select(`id, email`)
          .eq("shop_id", params.shopId);

        if (membershipError) throw membershipError;

        const emails = memberships?.map((membership) => membership.email) ?? [];

        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select(
            "student_number, first_name, last_name, email, contact_number, section, year, colleges(name), programs(name)",
          )
          .in("email", emails)
          .returns<Profiles>();

        if (profileError) throw profileError;

        const profileEmails = profiles?.map((profile) => profile.email) ?? [];
        const unmatched = emails.filter(
          (email) => !profileEmails.includes(email),
        );

        setUnmatchedEmails(unmatched);
        setProfiles(profiles ?? []);
      } catch (error) {
        console.error("Error fetching memberships:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getMembers();
  }, [params.shopId]);

  return (
    <div className="container mx-auto space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Shop Memberships</CardTitle>
            </div>
            <AddMemberDialog shopId={params.shopId} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : (
            <>
              {unmatchedEmails.length > 0 && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <h6 className="mb-2 flex items-center font-semibold">
                    <Mail className="mr-2 h-4 w-4 text-yellow-600" />
                    Unregistered Emails
                  </h6>
                  <div className="h-24">
                    <ul className="space-y-1">
                      {unmatchedEmails.map((email, index) => (
                        <li
                          key={index}
                          className="rounded bg-yellow-100 px-2 py-1 text-sm text-yellow-800"
                        >
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <MembershipTable profiles={profiles} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AddMemberDialog = ({ shopId }: { shopId: string }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddMember = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setIsAdding(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("memberships").insert({
        shop_id: shopId,
        email: email,
      });

      if (error) throw error;

      // Reset form
      setEmail("");
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Add New Member</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter member email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            className="w-full"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex space-x-2">
            <Button
              onClick={handleAddMember}
              disabled={isAdding}
              className="flex flex-1 items-center space-x-2"
            >
              {isAdding ? "Adding..." : "Invite Member"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MembershipTable = ({ profiles }: { profiles: Profiles }) => (
  <div className="rounded-md border">
    <div className="flex items-center border-b p-4">
      <Users className="mr-2 h-5 w-5 text-primary" />
      <h6 className="font-semibold">Registered Members</h6>
    </div>
    <div className="">
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            {[
              { icon: GraduationCap, label: "Student Number" },
              { icon: Users, label: "Name" },
              { icon: Mail, label: "Email" },
              { icon: Phone, label: "Contact" },
              { icon: BookOpen, label: "College" },
              { icon: BookOpen, label: "Program" },
              { icon: Users, label: "Section" },
              { icon: CalendarDays, label: "Year" },
            ].map(({ icon: Icon, label }) => (
              <th
                key={label}
                className="border-b px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                <div className="flex items-center space-x-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles?.map((profile) => (
            <tr
              key={profile.student_number}
              className="transition-colors hover:bg-gray-50"
            >
              {[
                profile.student_number,
                `${profile.first_name} ${profile.last_name}`,
                profile.email,
                profile.contact_number,
                profile.colleges?.name,
                profile.programs?.name,
                profile.section,
                profile.year,
              ].map((value, index) => (
                <td key={index} className="border-b px-4 py-2 text-sm">
                  {value || "N/A"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {profiles.length === 0 && (
      <div className="py-8 text-center text-muted-foreground">
        No registered members yet
      </div>
    )}
  </div>
);

export default Membership;
