package com.triofsnd.homescreen

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenButtonAccessibilityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun test_button_height_accessibility() {
        composeTestRule.setContent {
            HomeScreen()
        }

        val minAccessibleHeight = 64.dp

        composeTestRule.onNodeWithTag("HomePrimaryButton")
            .assertIsDisplayed()

        composeTestRule.onNodeWithTag("HomePrimaryButton")
            .assertHeightAtLeast(minAccessibleHeight)
    }

    @Test
    fun test_all_primary_action_buttons_meet_min_touch_target() {
        composeTestRule.setContent {
            HomeScreen()
        }

        val minAccessibleHeight = 64.dp

        composeTestRule.onNodeWithTag("HomePrimaryButton")
            .assertHeightAtLeast(minAccessibleHeight)

        composeTestRule.onNodeWithTag("HomeSecondaryButton")
            .assertHeightAtLeast(minAccessibleHeight)
    }

    @Test
    fun test_button_is_displayed_and_clickable() {
        composeTestRule.setContent {
            HomeScreen()
        }

        composeTestRule.onNodeWithTag("HomePrimaryButton")
            .assertIsDisplayed()
            .assertHasClickAction()
    }

    private fun androidx.compose.ui.test.SemanticsNodeInteraction.assertHeightAtLeast(
        minHeight: androidx.compose.ui.unit.Dp
    ) {
        val nodeBounds = this.fetchSemanticsNode().boundsInRoot
        val heightDp = with(composeTestRule.density) {
            (nodeBounds.height.toDp())
        }
        assert(heightDp >= minHeight) {
            "Expected button height to be at least ${minHeight.value}dp, but was ${heightDp.value}dp"
        }
    }
}