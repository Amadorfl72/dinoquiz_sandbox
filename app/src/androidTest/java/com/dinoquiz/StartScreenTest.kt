package com.dinoquiz

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.greaterThanOrEqualTo
import org.junit.After
import org.junit.Assert.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenTest {

    private lateinit var scenario: ActivityScenario<StartActivity>

    @Before
    fun setUp() {
        scenario = ActivityScenario.launch(StartActivity::class.java)
    }

    @After
    fun tearDown() {
        scenario.close()
    }

    @Test
    fun title_displaysDinoQuiz() {
        onView(withId(R.id.titleText))
            .check(matches(isDisplayed()))
            .check(matches(withText("DinoQuiz")))
    }

    @Test
    fun dinosaurIllustration_isDisplayed() {
        onView(withId(R.id.dinosaurIllustration))
            .check(matches(isDisplayed()))
    }

    @Test
    fun playButton_displaysJugarText() {
        onView(withId(R.id.playButton))
            .check(matches(isDisplayed()))
            .check(matches(withText("¡Jugar!")))
    }

    @Test
    fun playButton_isAtLeast64dpHigh() {
        onView(withId(R.id.playButton))
            .check(matches(isDisplayed()))
            .check { view, noViewFoundException ->
                if (noViewFoundException != null) throw noViewFoundException
                val density = view.resources.displayMetrics.density
                val heightDp = view.height / density
                assertThat(
                    "Play button height should be at least 64dp",
                    heightDp,
                    greaterThanOrEqualTo(64f)
                )
            }
    }

    @Test
    fun playButton_isClickable() {
        onView(withId(R.id.playButton))
            .perform(click())
    }
}
