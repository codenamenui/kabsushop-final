"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/clients/createClient";
import { toast } from "sonner";

// Type definitions for form data and validation
interface ProgramFormData {
  name: string;
  collegeId: string;
}

interface College {
  id: number;
  name: string;
}

const AddProgramPage: React.FC = () => {
  const [formData, setFormData] = useState<ProgramFormData>({
    name: "",
    collegeId: "",
  });

  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch colleges on component mount
  useEffect(() => {
    const fetchColleges = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("colleges")
        .select("id, name")
        .order("name");

      if (error) {
        toast.error("Failed to load colleges");
        return;
      }

      setColleges(data || []);
    };

    fetchColleges();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    const { name, collegeId } = formData;

    if (!name.trim()) {
      toast.error("Program name is required");
      return false;
    }

    if (!collegeId) {
      toast.error("Please select a college");
      return false;
    }

    // Optional: Add more specific validation
    if (name.trim().length < 3) {
      toast.error("Program name must be at least 3 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Insert program data
      const { data, error } = await supabase
        .from("programs")
        .insert({
          name: formData.name.trim(),
          college_id: parseInt(formData.collegeId),
        })
        .select();

      if (error) {
        // Check for unique constraint violation
        if (error.code === "23505") {
          toast.error("A program with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Program added successfully!");
      router.push("/programs"); // Redirect to programs list
    } catch (error: any) {
      console.error("Error adding program:", error);
      toast.error(error.message || "Failed to add program");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-center text-3xl font-bold">Add New Program</h1>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mb-4 max-w-lg rounded bg-white px-8 pb-8 pt-6 shadow-md"
      >
        <div className="mb-4">
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-bold text-gray-700"
          >
            Program Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            placeholder="Enter full program name"
            required
            maxLength={100} // Match database column length
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="collegeId"
            className="mb-2 block text-sm font-bold text-gray-700"
          >
            College
          </label>
          <select
            id="collegeId"
            name="collegeId"
            value={formData.collegeId}
            onChange={handleInputChange}
            className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
            required
          >
            <option value="">Select a College</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isLoading}
            className="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "Adding..." : "Add Program"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/programs")}
            className="focus:shadow-outline rounded px-4 py-2 font-bold text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProgramPage;
