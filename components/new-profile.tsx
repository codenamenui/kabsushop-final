import React from "react";
import ProfileInputComponent from "./profile-input";
import { Button } from "./ui/button";
import { createServerClient } from "@/supabase/clients/createServer";
import { College, Profile, Program } from "@/constants/type";
import CollegeProgramInput from "./college-program-input";

const NewProfile = async () => {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: colleges } = await supabase
    .from("colleges")
    .select()
    .returns<College[]>();
  const { data: programs } = await supabase
    .from("programs")
    .select()
    .returns<Program[]>();
  const { data: profile } = (await supabase
    .from("profiles")
    .select()
    .eq("id", user?.id)
    .single()) as { data: Profile };

  const profileInputs = [
    {
      label: "Student Number",
      type: "text",
      name: "student_number",
      id: "student_number",
      placeholder: "Enter student number...",
      value: profile?.student_number || "",
    },
    {
      label: "First Name",
      type: "text",
      name: "first_name",
      id: "first_name",
      placeholder: "Enter first name...",
      value: profile?.first_name || "",
    },
    {
      label: "Last Name",
      type: "text",
      name: "last_name",
      id: "last_name",
      placeholder: "Enter last name...",
      value: profile?.last_name || "",
    },
    {
      label: "Contact Number",
      type: "text",
      name: "contact_number",
      id: "contact_number",
      placeholder: "Enter contact number...",
      value: profile?.contact_number || "",
    },
    {
      label: "Year",
      type: "text",
      name: "year",
      id: "year",
      placeholder: "Enter year level...",
      value: profile?.year.toString() || "",
    },
    {
      label: "Section",
      type: "text",
      name: "section",
      id: "section",
      placeholder: "Enter section...",
      value: profile?.section.toString() || "",
    },
  ];

  const handleProfileSubmit = async (formData: FormData) => {
    "use server";

    const fname = formData.get("first_name");
    const lname = formData.get("last_name");
    const studNumber = formData.get("student_number");
    const contact = formData.get("contact_number");
    const year = formData.get("year");
    const section = formData.get("section");
    const selectedCollege = formData.get("college");
    const selectedProgram = formData.get("program");

    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(authError);
      return;
    }

    if (profile != null) {
      const { error: databaseError } = await supabase
        .from("profiles")
        .update([
          {
            first_name: fname,
            last_name: lname,
            student_number: studNumber,
            contact_number: contact,
            college_id: selectedCollege,
            program_id: selectedProgram,
            year: year,
            section: section,
            email: user?.email,
          },
        ])
        .eq("id", user?.id);

      if (databaseError) {
        console.error(databaseError);
        return;
      }
    } else {
      const { error: databaseError } = await supabase.from("profiles").insert([
        {
          id: user?.id,
          first_name: fname,
          last_name: lname,
          student_number: studNumber,
          contact_number: contact,
          college_id: selectedCollege,
          program_id: selectedProgram,
          year: year,
          section: section,
          email: user?.email,
        },
      ]);
      if (databaseError) {
        console.error(databaseError);
        return;
      }
    }
  };

  return (
    <form action={handleProfileSubmit} className="flex flex-col gap-4">
      {profileInputs?.map((input, index) => (
        <ProfileInputComponent
          label={input.label}
          type={input.type}
          name={input.name}
          id={input.id}
          placeholder={input.placeholder}
          key={index}
          defaultValue={input.value}
        />
      ))}

      <CollegeProgramInput
        colleges={colleges ?? []}
        programs={programs ?? []}
        defaultCollegeId={profile?.college_id}
        defaultProgramId={profile?.program_id}
      />

      <Button className="w-full">Submit</Button>
    </form>
  );
};

export default NewProfile;
