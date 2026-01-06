import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocalStorage } from "react-use";
import { z } from "zod";
import { STRIPE_API_KEY } from "../../../constants/stripe-api-key";
import { useNavigate } from "react-router";
import { paths } from "../../../config/paths";

const LoginForm = () => {
  const navigate = useNavigate();
  const [, setApiKey] = useLocalStorage<string>(STRIPE_API_KEY, "");
  const schema = z.object({
    apiKey: z.string().min(1),
  });

  type form = z.infer<typeof schema>;

  const { register, getValues, setError } = useForm<form>({
    resolver: zodResolver(schema),
    defaultValues: {
      apiKey: "",
    },
  });

  const onSubmit = () => {
    const data = getValues();
    const dataParsing = schema.safeParse(data);
    if (!dataParsing.success && dataParsing.error) {
      dataParsing.error.issues.forEach((issue) => {
        setError(issue.path[0] as keyof form, { message: issue.message });
      });
      return;
    }
    setApiKey(data.apiKey);
    navigate(paths.app.dashboard.getHref());
    return;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input {...register("apiKey")} placeholder='sk_test_...' />
      <button type='submit'>Valider</button>
    </form>
  );
};

export default LoginForm;
