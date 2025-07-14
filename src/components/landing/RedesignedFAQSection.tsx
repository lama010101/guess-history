
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const RedesignedFAQSection = () => {
  const [openItems, setOpenItems] = useState<number[]>([0]); // First item open by default

  const faqs = [
    {
      question: "How do I play Guess History?",
      answer: "Simply look at a historical image, make your best guess about when and where it happened, then see how close you were! You'll learn the real story behind each moment."
    },
    {
      question: "Do I need to create an account?",
      answer: "No! You can start playing immediately as a guest. Creating an account lets you save your progress, compete with friends, and track your improvement over time."
    },
    {
      question: "Are the images real historical photos?",
      answer: "We use a mix of carefully curated historical photographs and AI-generated images based on real historical events. Each image is designed to be educational and accurate."
    },
    {
      question: "How is my score calculated?",
      answer: "Your score is based on how close your guess is to the actual time and location. The closer you guess, the higher your score. Bonus points are awarded for perfect guesses!"
    },
    {
      question: "Can I play with friends?",
      answer: "Yes! You can create private rooms to challenge your friends, or compete in daily global challenges with players from around the world."
    }
  ];

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                className="w-full text-left p-6 flex justify-between items-center hover:bg-black/20 transition-all duration-200"
                onClick={() => toggleItem(index)}
              >
                <h3 className="text-lg font-semibold text-white pr-4" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  {faq.question}
                </h3>
                {openItems.includes(index) ? (
                  <ChevronUp className="w-5 h-5 text-orange-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-400 flex-shrink-0" />
                )}
              </button>
              
              {openItems.includes(index) && (
                <div className="px-6 pb-6">
                  <p className="text-slate-300 leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RedesignedFAQSection;
