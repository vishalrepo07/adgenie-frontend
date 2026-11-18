import React, { createContext, useContext, useState } from 'react';
import { PRESET_CREATIVES } from '../data/campaignData';
import { registerUser, loginUser, generateCampaign } from '../services/api';

const CampaignContext = createContext();

export function CampaignProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [promptInput, setPromptInput] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('gen-z');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'facebook']);
  const [generatedCreatives, setGeneratedCreatives] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRegister = async (name, email, password) => {
    try {
      const data = await registerUser(name, email, password);
      triggerToast(`Account created! Please sign in.`);
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed';
      triggerToast(msg);
      return false;
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      setUser({ id: data.user_id, name: data.name });
      setIsSignInOpen(false);
      triggerToast(`Welcome back, ${data.name}!`);
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed';
      triggerToast(msg);
      return false;
    }
  };

  const handleSignOut = () => {
    setUser(null);
    triggerToast('Signed out successfully.');
  };

  const togglePlatform = (platId) => {
    if (selectedPlatforms.includes(platId)) {
      if (selectedPlatforms.length === 1) {
        triggerToast('Please keep at least one platform selected.');
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platId]);
    }
  };

  const handleGenerate = async () => {
    if (!promptInput.trim()) {
      triggerToast('Please enter a product description brief.');
      return;
    }

    if (!user) {
      triggerToast('Please sign in first.');
      setIsSignInOpen(true);
      return;
    }

    setIsGenerating(true);

    try {
      const platform = selectedPlatforms[0] || 'instagram';
      const audience = selectedAgeGroup;
      const budget = '5000';

      const data = await generateCampaign(user.id, promptInput, platform, audience, budget);

      const mapped = data.variants.map((v, idx) => ({
        id: v.id,
        title: v.angle,
        headline: v.headline,
        subheading: v.caption,
        cta: v.cta,
        type: 'image',
        audience: data.audience,
        platform: data.platform,
        imageUrl: v.image_url,
        tag: `@adgenie.${data.platform}`,
        hashtags: v.hashtags,
        score: v.score,
        tips: v.tips,
      }));

      setGeneratedCreatives(mapped);
      triggerToast(`Generated ${mapped.length} platform-tailored ad creatives!`);

      const outputElem = document.getElementById('studio-output');
      if (outputElem) {
        outputElem.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Generation failed. Please try again.';
      triggerToast(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <CampaignContext.Provider
      value={{
        user,
        isSignInOpen,
        setIsSignInOpen,
        activeTab,
        setActiveTab,
        promptInput,
        setPromptInput,
        selectedAgeGroup,
        setSelectedAgeGroup,
        selectedPlatforms,
        togglePlatform,
        generatedCreatives,
        isGenerating,
        handleSignIn,
        handleRegister,
        handleSignOut,
        handleGenerate,
        toastMessage,
        triggerToast,
        PRESET_CREATIVES,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}