"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ProfileFormDialog,
  type ProfileFormValues,
} from "@/components/profile/profile-form-dialog";

export function ProfileEditButton({ name, profile }: { name: string; profile: ProfileFormValues | null }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit profile
      </Button>
      <ProfileFormDialog
        key={`${open ? "open" : "closed"}-${name}-${profile?.updatedAt instanceof Date ? profile.updatedAt.toISOString() : "empty"}`}
        open={open}
        onOpenChange={setOpen}
        name={name}
        profile={profile}
      />
    </>
  );
}
