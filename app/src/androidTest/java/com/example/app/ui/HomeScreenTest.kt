package com.example.app.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun test_button_height_accessibility() {
        composeTestRule.setContent {
            HomeScreen()
        }

        // Verify that the primary button on the Home Screen meets the minimum accessibility height requirement
        composeTestRule.onNodeWithText("Get Started")
            .assertHeightIsAtLeast(64.dp)
    }
}
