CREATE TABLE "job_runs" (
	"job_name" text NOT NULL,
	"ran_on" date NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_runs_job_name_ran_on_pk" PRIMARY KEY("job_name","ran_on")
);
