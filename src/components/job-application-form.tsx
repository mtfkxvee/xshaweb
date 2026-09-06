import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitJobApplication, type JobOpening } from "@/lib/erpnext/careers";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const applicationSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z.string().optional(),
  coverLetter: z.string().optional(),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function JobApplicationForm({ job, onDone }: { job: JobOpening; onDone: () => void }) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationValues>({ resolver: zodResolver(applicationSchema) });

  const onSubmit = async (values: ApplicationValues) => {
    if (resumeFile && resumeFile.size > MAX_RESUME_BYTES) {
      toast.error("Ukuran file CV maksimal 5MB.");
      return;
    }

    const result = await submitJobApplication({
      data: {
        jobId: job.id,
        name: values.name,
        email: values.email,
        phone: values.phone ?? "",
        coverLetter: values.coverLetter ?? "",
        resume: resumeFile
          ? {
              fileName: resumeFile.name,
              mimeType: resumeFile.type || "application/octet-stream",
              base64: await fileToBase64(resumeFile),
            }
          : null,
      },
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Lamaran berhasil dikirim. Terima kasih!");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lamar sebagai {job.title}</DialogTitle>
        <DialogDescription>
          Isi data diri kamu di bawah ini. Tim HR X-SHA akan menghubungi kandidat terpilih.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="applicant-name" className="mb-1 block text-sm font-semibold">
            Nama Lengkap
          </label>
          <input
            id="applicant-name"
            {...register("name")}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="applicant-email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="applicant-email"
            type="email"
            {...register("email")}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="applicant-phone" className="mb-1 block text-sm font-semibold">
            Nomor HP
          </label>
          <input
            id="applicant-phone"
            type="tel"
            {...register("phone")}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="applicant-cover-letter" className="mb-1 block text-sm font-semibold">
            Pesan / Cover Letter
          </label>
          <textarea
            id="applicant-cover-letter"
            {...register("coverLetter")}
            rows={4}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="applicant-resume" className="mb-1 block text-sm font-semibold">
            CV / Resume (PDF, maks. 5MB)
          </label>
          <input
            id="applicant-resume"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl primary-gradient px-6 py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? "Mengirim..." : "Kirim Lamaran"}
        </button>
      </form>
    </>
  );
}
