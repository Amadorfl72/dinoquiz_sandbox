package com.triofsnd.homescreen

import org.junit.Test

class HomeScreenButtonAccessibilityUnitTest {

    @Test
    fun `primary button height meets accessibility minimum of 64dp`() {
        val expectedMinHeightDp = 64
        val actualButtonHeightDp = HomeScreenButtonDefaults.PrimaryButtonHeightDp

        assert(actualButtonHeightDp >= expectedMinHeightDp) {
            "Expected button height to be at least $expectedMinHeightDp dp, but was $actualButtonHeightDp dp"
        }
    }

    @Test
    fun `secondary button height meets accessibility minimum of 64dp`() {
        val expectedMinHeightDp = 64
        val actualButtonHeightDp = HomeScreenButtonDefaults.SecondaryButtonHeightDp

        assert(actualButtonHeightDp >= expectedMinHeightDp) {
            "Expected button height to be at least $expectedMinHeightDp dp, but was $actualButtonHeightDp dp"
        }
    }

    @Test
    fun `button height default is not the old non-compliant 56dp`() {
        val nonCompliantHeightDp = 56
        val actualButtonHeightDp = HomeScreenButtonDefaults.PrimaryButtonHeightDp

        assert(actualButtonHeightDp != nonCompliantHeightDp) {
            "Button height is still set to the non-compliant $nonCompliantHeightDp dp value"
        }
    }
}