import Image from "next/image";
import ModalContainer from "./ModalContainer";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { FeatureRequestFormData, featureRequestSchema } from "~~/lib/form/schemas";
import { featureRequestApi } from "~~/services/api";
import { ModalProps } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth";

const BUTTON_BASE_CLASS = "text-main-black font-medium h-9 text-sm rounded-lg disabled:opacity-50";

const RequestFeatureModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FeatureRequestFormData>({
    resolver: zodResolver(featureRequestSchema),
    mode: "onChange",
    defaultValues: { content: "" },
  });

  const content = watch("content");
  const isDisabled = isSubmitting || !content?.trim();

  const onSubmit = async (data: FeatureRequestFormData) => {
    try {
      await featureRequestApi.create(data);
      notification.success("Feature request submitted successfully!");
      reset();
      onClose();
    } catch (error) {
      console.error("Error submitting feature request:", error);
      notification.error("Failed to submit feature request");
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      isCloseButton={false}
      className="bg-white border border-white rounded-4xl max-w-xl p-0"
    >
      <div className="relative w-full h-full">
        <div className="p-4 relative">
          <Image
            className="absolute w-full h-full top-0 left-0 z-10 rounded-t-4xl"
            src="/dashboard/bg-request-feature.png"
            alt="background"
            width={512}
            height={500}
          />
          <div className="relative z-50 pt-3">
            <h3 className="text-2xl font-medium text-center text-main-black">Request a new feature</h3>
            <button
              type="button"
              className="absolute h-9 w-9 right-2 top-1/2 transform -translate-y-1/2 flex items-center justify-center rounded-lg border border-grey-200 cursor-pointer"
              onClick={handleCancel}
              aria-label="Close"
            >
              <X width={14} height={14} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="my-8 relative z-50">
              <textarea
                {...register("content")}
                className="w-full outline-none border border-grey-200 bg-[#FFFFFFCC] rounded-2xl p-4 h-[180px] resize-none"
                placeholder="Describe the feature you'd like to see — what problem it solves and how you'd use it."
              />
              {errors.content && <p className="text-red-500 text-sm mt-2">{errors.content.message}</p>}
            </div>
          </form>
        </div>
        <div className="flex items-center gap-2 w-full px-5 py-4 border-t border-grey-200 bg-grey-50 rounded-b-4xl">
          <button
            type="button"
            className={`${BUTTON_BASE_CLASS} w-[90px] text-center bg-grey-100`}
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${BUTTON_BASE_CLASS} w-full bg-main-pink disabled:cursor-not-allowed`}
            onClick={handleSubmit(onSubmit)}
            disabled={isDisabled}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default RequestFeatureModal;
