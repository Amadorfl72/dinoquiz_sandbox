package com.dinoquiz

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenTest {

    @Test
    fun startScreen_displaysAllElementsAndRendersUnder3Seconds() {
        val startTime = System.currentTimeMillis()

        ActivityScenario.launch(StartActivity::class.java).use {
            val renderTime = System.currentTimeMillis() - startTime
            assertTrue("Screen should render in less than 3 seconds", renderTime < 3000)

            // Check title
            onView(withText("DinoQuiz")).check(matches(isDisplayed()))

            // Check dinosaur illustration
            onView(withId(R.id.dinosaurIllustration)).check(matches(isDisplayed()))

            // Check '¡Jugar!' button
            onView(withText("¡Jugar!")).check(matches(isDisplayed()))

            // Check button height is at least 64dp
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val expectedHeight = (64 * context.resources.displayMetrics.density).toInt()
            onView(withText("¡Jugar!")).check { view, noViewFoundException ->
                if (noViewFoundException != null) throw noViewFoundException
                assertTrue("Button height should be at least 64dp", view.height >= expectedHeight)
            }
        }
    }
}