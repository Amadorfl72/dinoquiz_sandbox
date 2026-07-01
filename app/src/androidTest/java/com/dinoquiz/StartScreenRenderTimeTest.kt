package com.dinoquiz

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenRenderTimeTest {

    @Test
    fun startScreen_rendersInUnder3Seconds() {
        val startTime = System.currentTimeMillis()

        ActivityScenario.launch(StartActivity::class.java).use { scenario ->
            onView(withId(R.id.playButton))
                .check(matches(isDisplayed()))

            onView(withId(R.id.titleText))
                .check(matches(isDisplayed()))

            onView(withId(R.id.dinosaurIllustration))
                .check(matches(isDisplayed()))
        }

        val renderDurationMs = System.currentTimeMillis() - startTime
        assertTrue(
            "Start screen should render in under 3000ms, but took ${renderDurationMs}ms",
            renderDurationMs < 3000L
        )
    }
}
