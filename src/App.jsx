import { Routes, Route, Navigate } from 'react-router-dom'

// Pages
import Home from './pages/Home'
import OnboardingPersona from './pages/OnboardingPersona'
import OnboardingDietary from './pages/OnboardingDietary'
import OnboardingHealth from './pages/OnboardingHealth'
import OnboardingDislikes from './pages/OnboardingDislikes'
import IngredientInput from './pages/IngredientInput'
import SuggestionResults from './pages/SuggestionResults'
import Pantry from './pages/Pantry'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'

function App() {
  return (
    <div className="min-h-screen bg-[#0B1D33]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<OnboardingPersona />} />
        <Route path="/onboarding/dietary" element={<OnboardingDietary />} />
        <Route path="/onboarding/health" element={<OnboardingHealth />} />
        <Route path="/onboarding/dislikes" element={<OnboardingDislikes />} />
        <Route path="/suggest/ingredients" element={<IngredientInput />} />
        <Route path="/suggest/results" element={<SuggestionResults />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App